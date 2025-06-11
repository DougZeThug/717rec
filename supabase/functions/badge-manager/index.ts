
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchCompletedEvent {
  event_type: 'match_completed';
  match_id: string;
  winner_id: string;
  loser_id: string;
  team1_id: string;
  team2_id: string;
  team1_score: number;
  team2_score: number;
}

interface BadgeDetectionResult {
  teamId: string;
  badgeType: string;
  metadata: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      'https://wcitdamvochthvxvtxyb.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { event_type, ...eventData } = await req.json() as MatchCompletedEvent;
    
    console.log('Badge Manager: Processing event', event_type, eventData);

    if (event_type === 'match_completed') {
      const badgesToAward = await detectDynamicBadges(supabase, eventData);
      
      // Award detected badges
      for (const badge of badgesToAward) {
        await awardBadge(supabase, badge);
      }

      console.log(`Badge Manager: Awarded ${badgesToAward.length} badges`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          badgesAwarded: badgesToAward.length,
          badges: badgesToAward 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown event type' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );

  } catch (error) {
    console.error('Badge Manager Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function detectDynamicBadges(supabase: any, eventData: Omit<MatchCompletedEvent, 'event_type'>): Promise<BadgeDetectionResult[]> {
  const badges: BadgeDetectionResult[] = [];
  
  // Get team details and recent match history
  const { data: teams } = await supabase
    .from('v_team_details')
    .select('*')
    .in('team_id', [eventData.winner_id, eventData.loser_id]);

  if (!teams || teams.length < 2) return badges;

  const winner = teams.find(t => t.team_id === eventData.winner_id);
  const loser = teams.find(t => t.team_id === eventData.loser_id);

  if (!winner || !loser) return badges;

  console.log('Badge Detection: Analyzing match between', winner.name, 'vs', loser.name);

  // 1. King Slayer Badge - Beat a team with significantly higher power score
  if (winner.power_score < loser.power_score) {
    const powerDifference = loser.power_score - winner.power_score;
    if (powerDifference >= 15) { // Significant upset
      badges.push({
        teamId: eventData.winner_id,
        badgeType: 'king_slayer',
        metadata: {
          defeatedTeam: loser.name,
          powerDifference: powerDifference,
          matchId: eventData.match_id,
          defeatedPowerScore: loser.power_score,
          winnerPowerScore: winner.power_score
        }
      });
      console.log(`King Slayer detected: ${winner.name} upset ${loser.name} (power diff: ${powerDifference})`);
    }
  }

  // 2. Clutch Performer Badge - Win close matches consistently
  await detectClutchPerformer(supabase, eventData, badges);

  // 3. Consistent Performer Badge - High win rate over time
  await detectConsistentPerformer(supabase, eventData, badges);

  // 4. Hot Streak Badge - Multiple consecutive wins
  await detectHotStreak(supabase, eventData, badges);

  // 5. Cold Streak Badge - Multiple consecutive losses
  await detectColdStreak(supabase, eventData, badges);

  return badges;
}

async function detectClutchPerformer(supabase: any, eventData: any, badges: BadgeDetectionResult[]) {
  // Check if this was a close match (decided by 1-2 points)
  const scoreDiff = Math.abs(eventData.team1_score - eventData.team2_score);
  if (scoreDiff > 2) return; // Not a close match

  // Get recent close matches for the winner
  const { data: recentMatches } = await supabase
    .from('matches')
    .select('*')
    .or(`winner_id.eq.${eventData.winner_id},loser_id.eq.${eventData.winner_id}`)
    .eq('iscompleted', true)
    .order('date', { ascending: false })
    .limit(10);

  if (!recentMatches) return;

  // Count close wins in recent matches
  const closeWins = recentMatches.filter(match => {
    const isWinner = match.winner_id === eventData.winner_id;
    const matchScoreDiff = Math.abs(match.team1_score - match.team2_score);
    return isWinner && matchScoreDiff <= 2;
  }).length;

  // Award clutch badge if 3+ close wins in last 10 matches
  if (closeWins >= 3) {
    badges.push({
      teamId: eventData.winner_id,
      badgeType: 'clutch_performer',
      metadata: {
        closeWins: closeWins,
        totalRecentMatches: recentMatches.length,
        matchId: eventData.match_id
      }
    });
    console.log(`Clutch Performer detected: ${closeWins} close wins in recent matches`);
  }
}

async function detectConsistentPerformer(supabase: any, eventData: any, badges: BadgeDetectionResult[]) {
  // Get team's current stats
  const { data: teamStats } = await supabase
    .from('v_team_details')
    .select('*')
    .eq('team_id', eventData.winner_id)
    .single();

  if (!teamStats) return;

  // Award if high win rate (80%+) with significant number of games (10+)
  const totalMatches = (teamStats.wins || 0) + (teamStats.losses || 0);
  const winRate = totalMatches > 0 ? (teamStats.wins || 0) / totalMatches : 0;

  if (totalMatches >= 10 && winRate >= 0.8) {
    badges.push({
      teamId: eventData.winner_id,
      badgeType: 'consistent_performer',
      metadata: {
        winRate: winRate,
        totalMatches: totalMatches,
        wins: teamStats.wins,
        matchId: eventData.match_id
      }
    });
    console.log(`Consistent Performer detected: ${winRate} win rate over ${totalMatches} matches`);
  }
}

async function detectHotStreak(supabase: any, eventData: any, badges: BadgeDetectionResult[]) {
  // Get recent matches for the winner in chronological order
  const { data: recentMatches } = await supabase
    .from('matches')
    .select('*')
    .or(`winner_id.eq.${eventData.winner_id},loser_id.eq.${eventData.winner_id}`)
    .eq('iscompleted', true)
    .order('date', { ascending: false })
    .limit(10);

  if (!recentMatches || recentMatches.length < 5) return;

  // Count consecutive wins from most recent
  let consecutiveWins = 0;
  for (const match of recentMatches) {
    if (match.winner_id === eventData.winner_id) {
      consecutiveWins++;
    } else {
      break; // Streak broken
    }
  }

  // Award hot streak for 5+ consecutive wins
  if (consecutiveWins >= 5) {
    badges.push({
      teamId: eventData.winner_id,
      badgeType: 'hot_streak',
      metadata: {
        consecutiveWins: consecutiveWins,
        matchId: eventData.match_id
      }
    });
    console.log(`Hot Streak detected: ${consecutiveWins} consecutive wins`);
  }
}

async function detectColdStreak(supabase: any, eventData: any, badges: BadgeDetectionResult[]) {
  // Get recent matches for the loser in chronological order
  const { data: recentMatches } = await supabase
    .from('matches')
    .select('*')
    .or(`winner_id.eq.${eventData.loser_id},loser_id.eq.${eventData.loser_id}`)
    .eq('iscompleted', true)
    .order('date', { ascending: false })
    .limit(10);

  if (!recentMatches || recentMatches.length < 5) return;

  // Count consecutive losses from most recent
  let consecutiveLosses = 0;
  for (const match of recentMatches) {
    if (match.loser_id === eventData.loser_id) {
      consecutiveLosses++;
    } else {
      break; // Streak broken
    }
  }

  // Award cold streak for 5+ consecutive losses
  if (consecutiveLosses >= 5) {
    badges.push({
      teamId: eventData.loser_id,
      badgeType: 'cold_streak',
      metadata: {
        consecutiveLosses: consecutiveLosses,
        matchId: eventData.match_id
      }
    });
    console.log(`Cold Streak detected: ${consecutiveLosses} consecutive losses`);
  }
}

async function awardBadge(supabase: any, badge: BadgeDetectionResult) {
  // Check if badge already exists (prevent duplicates)
  const { data: existingBadge } = await supabase
    .from('team_badge_events')
    .select('id')
    .eq('team_id', badge.teamId)
    .eq('badge_type', badge.badgeType)
    .eq('is_active', true)
    .single();

  if (existingBadge) {
    console.log(`Badge ${badge.badgeType} already exists for team ${badge.teamId}`);
    return;
  }

  // Award the badge
  const { error } = await supabase
    .from('team_badge_events')
    .insert({
      team_id: badge.teamId,
      badge_type: badge.badgeType,
      metadata: badge.metadata,
      awarded_at: new Date().toISOString(),
      is_active: true
    });

  if (error) {
    console.error('Error awarding badge:', error);
  } else {
    console.log(`Successfully awarded ${badge.badgeType} badge to team ${badge.teamId}`);
  }
}

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamAnalysisResponse {
  overall: string;
  strengths: string[];
  weaknesses: string[];
  trends: string;
  rivalryInsights: string | null;
  confidence: 'high' | 'medium' | 'low';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teamId } = await req.json();

    if (!teamId) {
      return new Response(
        JSON.stringify({ error: 'teamId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching data for team:', teamId);

    // Fetch team details from v_team_details
    const { data: teamData, error: teamError } = await supabase
      .from('v_team_details')
      .select('*')
      .eq('team_id', teamId)
      .single();

    if (teamError || !teamData) {
      console.error('Error fetching team:', teamError);
      return new Response(
        JSON.stringify({ error: 'Team not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teamName = teamData.name; // Correct field name from v_team_details
    console.log('Team name:', teamName);

    // Fetch current season matches from matches table
    const { data: currentMatches, error: currentMatchesError } = await supabase
      .from('matches')
      .select(`
        id, date, team1_id, team2_id, team1_score, team2_score,
        team1_game_wins, team2_game_wins, winner_id, iscompleted
      `)
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .eq('iscompleted', true)
      .order('date', { ascending: false })
      .limit(15);

    if (currentMatchesError) {
      console.error('Error fetching current matches:', currentMatchesError);
    }
    console.log('Current season matches found:', currentMatches?.length || 0);

    // Fetch historical matches from matches_archive
    const { data: archivedMatches, error: archivedError } = await supabase
      .from('matches_archive')
      .select(`
        id, date, team1_id, team2_id, team1_score, team2_score,
        team1_game_wins, team2_game_wins, winner_id, iscompleted
      `)
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .eq('iscompleted', true)
      .order('date', { ascending: false })
      .limit(50);

    if (archivedError) {
      console.error('Error fetching archived matches:', archivedError);
    }
    console.log('Archived matches found:', archivedMatches?.length || 0);

    // Fetch head-to-head records from v_head_to_head view
    const { data: h2hData, error: h2hError } = await supabase
      .from('v_head_to_head')
      .select('*')
      .eq('team_id', teamId);

    if (h2hError) {
      console.error('Error fetching H2H data:', h2hError);
    }
    console.log('H2H records found:', h2hData?.length || 0);

    // Fetch playoff team records
    const { data: playoffRecords, error: playoffError } = await supabase
      .from('playoff_team_records')
      .select('*')
      .eq('team_id', teamId);

    if (playoffError) {
      console.error('Error fetching playoff records:', playoffError);
    }
    console.log('Playoff records found:', playoffRecords?.length || 0);

    // Collect all team IDs for name lookup
    const teamIds = new Set<string>();
    currentMatches?.forEach(m => {
      if (m.team1_id) teamIds.add(m.team1_id);
      if (m.team2_id) teamIds.add(m.team2_id);
    });
    archivedMatches?.forEach(m => {
      if (m.team1_id) teamIds.add(m.team1_id);
      if (m.team2_id) teamIds.add(m.team2_id);
    });
    h2hData?.forEach(h => {
      if (h.opponent_id) teamIds.add(h.opponent_id);
    });

    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', Array.from(teamIds));

    const teamNameMap: Record<string, string> = {};
    teamsData?.forEach(t => {
      teamNameMap[t.id] = t.name;
    });

    // Format current season matches
    const formatMatch = (m: any) => {
      const isTeam1 = m.team1_id === teamId;
      const opponentId = isTeam1 ? m.team2_id : m.team1_id;
      const won = m.winner_id === teamId;
      const teamScore = isTeam1 ? m.team1_score : m.team2_score;
      const oppScore = isTeam1 ? m.team2_score : m.team1_score;
      const teamGames = isTeam1 ? m.team1_game_wins : m.team2_game_wins;
      const oppGames = isTeam1 ? m.team2_game_wins : m.team1_game_wins;
      
      return {
        opponent: teamNameMap[opponentId] || 'Unknown',
        result: won ? 'W' : 'L',
        matchScore: `${teamScore || 0}-${oppScore || 0}`,
        gameScore: `${teamGames || 0}-${oppGames || 0}`,
        date: m.date
      };
    };

    const recentMatches = currentMatches?.map(formatMatch) || [];
    const historicalMatches = archivedMatches?.map(formatMatch) || [];

    // Format H2H data from view
    const headToHead = h2hData?.map(h => ({
      opponent: teamNameMap[h.opponent_id] || 'Unknown',
      wins: h.wins || 0,
      losses: h.losses || 0,
      winPct: h.win_percentage ? (h.win_percentage * 100).toFixed(0) : '0'
    })) || [];

    // Format playoff history
    const playoffHistory = playoffRecords?.map(p => ({
      placement: p.placement,
      wins: p.wins || 0,
      losses: p.losses || 0,
      gameWins: p.game_wins || 0,
      gameLosses: p.game_losses || 0
    })) || [];

    // Calculate total data points for confidence
    const currentMatchCount = currentMatches?.length || 0;
    const archivedMatchCount = archivedMatches?.length || 0;
    const h2hCount = h2hData?.length || 0;
    const totalDataPoints = currentMatchCount + archivedMatchCount + h2hCount;

    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (totalDataPoints >= 15 || (currentMatchCount >= 5 && h2hCount >= 3)) {
      confidence = 'high';
    } else if (totalDataPoints >= 6 || currentMatchCount >= 3) {
      confidence = 'medium';
    }

    console.log('Confidence level:', confidence, '- Total data points:', totalDataPoints);

    // Check if we have enough data
    if (currentMatchCount < 1 && archivedMatchCount < 3) {
      return new Response(
        JSON.stringify({
          overall: `${teamName} has limited match data available. More games are needed for a comprehensive analysis.`,
          strengths: ['Team roster is established'],
          weaknesses: ['Insufficient data for detailed analysis'],
          trends: 'Not enough matches to establish trends.',
          rivalryInsights: null,
          confidence: 'low'
        } as TeamAnalysisResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count championship wins
    const championships = playoffHistory.filter(p => p.placement === 1).length;
    const runnerUps = playoffHistory.filter(p => p.placement === 2).length;

    // Build comprehensive prompt for OpenAI
    const prompt = `Analyze this cornhole team's performance and provide insights:

TEAM: ${teamName}

CURRENT SEASON STATS:
- Record: ${teamData.wins || 0} wins, ${teamData.losses || 0} losses (${((teamData.win_percentage || 0) * 100).toFixed(1)}% win rate)
- Games: ${teamData.game_wins || 0} won, ${teamData.game_losses || 0} lost (${((teamData.game_win_percentage || 0) * 100).toFixed(1)}% game win rate)
- Power Score: ${teamData.power_score?.toFixed(2) || 'N/A'}
- Strength of Schedule: ${teamData.sos?.toFixed(3) || 'N/A'}
- Close Match Losses: ${teamData.close_match_losses || 0}
- Current Rank: #${teamData.rank || 'N/A'}

PLAYOFF/CHAMPIONSHIP HISTORY:
- Championships Won: ${championships}
- Runner-up Finishes: ${runnerUps}
- Total Playoff Appearances: ${playoffHistory.length}
${playoffHistory.length > 0 ? playoffHistory.map(p => `  - Placement: ${p.placement}${p.placement === 1 ? ' (Champion!)' : p.placement === 2 ? ' (Runner-up)' : ''}, Record: ${p.wins}-${p.losses}`).join('\n') : '- No playoff history yet'}

CURRENT SEASON MATCHES (${recentMatches.length} games, most recent first):
${recentMatches.length > 0 ? recentMatches.map((m, i) => `${i + 1}. vs ${m.opponent}: ${m.result} (Match: ${m.matchScore}, Games: ${m.gameScore})`).join('\n') : 'No current season matches yet'}

CAREER HEAD-TO-HEAD RECORDS (all-time):
${headToHead.length > 0 ? headToHead.map(h => `- vs ${h.opponent}: ${h.wins}W-${h.losses}L (${h.winPct}%)`).join('\n') : 'No head-to-head data available'}

HISTORICAL MATCHES (from previous seasons, ${historicalMatches.length} games):
${historicalMatches.slice(0, 10).map((m, i) => `${i + 1}. vs ${m.opponent}: ${m.result} (Match: ${m.matchScore}, Games: ${m.gameScore})`).join('\n') || 'No archived matches'}

Provide a JSON response with exactly this structure:
{
  "overall": "2-3 sentence overall assessment considering both current form AND historical performance/championships",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "trends": "1-2 sentences about current form and trajectory based on recent matches",
  "rivalryInsights": "1 sentence about notable H2H matchups, dominant opponents, or struggles - reference specific teams if data available, or null if insufficient data"
}

Be specific and reference actual stats, team names, and achievements. ${championships > 0 ? 'Highlight their championship pedigree!' : ''} Focus on actionable insights for a recreational cornhole league.`;

    console.log('Calling OpenAI with prompt for team:', teamName);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a sports analyst specializing in cornhole leagues. Provide concise, insightful analysis based on team statistics. Always respond with valid JSON matching the requested structure. Be encouraging but honest about areas for improvement.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse the JSON response from OpenAI
    let analysis: TeamAnalysisResponse;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError, content);
      // Fallback response
      analysis = {
        overall: content.substring(0, 200) || 'Analysis generated successfully.',
        strengths: ['Competitive team', 'Active participation'],
        weaknesses: ['Room for improvement'],
        trends: 'Analysis pending more detailed data.',
        rivalryInsights: null,
        confidence
      };
    }

    // Add confidence level
    analysis.confidence = confidence;

    console.log('Analysis generated successfully for team:', teamName);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-team function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

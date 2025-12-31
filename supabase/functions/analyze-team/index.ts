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

    // Fetch team details
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

    // Fetch recent matches (last 10)
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id,
        date,
        team1_id,
        team2_id,
        team1_score,
        team2_score,
        team1_game_wins,
        team2_game_wins,
        winner_id,
        iscompleted
      `)
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .eq('iscompleted', true)
      .order('date', { ascending: false })
      .limit(10);

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
    }

    // Get team names for matches
    const teamIds = new Set<string>();
    matchesData?.forEach(m => {
      if (m.team1_id) teamIds.add(m.team1_id);
      if (m.team2_id) teamIds.add(m.team2_id);
    });

    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', Array.from(teamIds));

    const teamNameMap: Record<string, string> = {};
    teamsData?.forEach(t => {
      teamNameMap[t.id] = t.name;
    });

    // Format matches for AI
    const recentMatches = matchesData?.map(m => {
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
        matchScore: `${teamScore}-${oppScore}`,
        gameScore: `${teamGames}-${oppGames}`,
        date: m.date
      };
    }) || [];

    // Calculate head-to-head summary from matches
    const h2hStats: Record<string, { opponent: string; wins: number; losses: number }> = {};
    matchesData?.forEach(m => {
      const isTeam1 = m.team1_id === teamId;
      const opponentId = isTeam1 ? m.team2_id : m.team1_id;
      const won = m.winner_id === teamId;
      const oppName = teamNameMap[opponentId] || 'Unknown';
      
      if (!h2hStats[opponentId]) {
        h2hStats[opponentId] = { opponent: oppName, wins: 0, losses: 0 };
      }
      if (won) {
        h2hStats[opponentId].wins++;
      } else {
        h2hStats[opponentId].losses++;
      }
    });

    const headToHead = Object.values(h2hStats);

    // Determine confidence level
    const matchCount = matchesData?.length || 0;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (matchCount >= 8) confidence = 'high';
    else if (matchCount >= 4) confidence = 'medium';

    // Check if we have enough data
    if (matchCount < 2) {
      return new Response(
        JSON.stringify({
          overall: `${teamData.team_name} has limited match data available. More games are needed for a comprehensive analysis.`,
          strengths: ['Team roster is established'],
          weaknesses: ['Insufficient data for detailed analysis'],
          trends: 'Not enough matches to establish trends.',
          rivalryInsights: null,
          confidence: 'low'
        } as TeamAnalysisResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build prompt for OpenAI
    const prompt = `Analyze this cornhole team's performance and provide insights:

TEAM: ${teamData.team_name}

SEASON STATS:
- Record: ${teamData.wins || 0} wins, ${teamData.losses || 0} losses (${((teamData.win_percentage || 0) * 100).toFixed(1)}% win rate)
- Games: ${teamData.game_wins || 0} won, ${teamData.game_losses || 0} lost (${((teamData.game_win_percentage || 0) * 100).toFixed(1)}% game win rate)
- Power Score: ${teamData.power_score?.toFixed(2) || 'N/A'}
- Strength of Schedule: ${teamData.sos?.toFixed(3) || 'N/A'}
- Close Match Losses: ${teamData.close_match_losses || 0}

RECENT MATCHES (most recent first):
${recentMatches.map((m, i) => `${i + 1}. vs ${m.opponent}: ${m.result} (Match: ${m.matchScore}, Games: ${m.gameScore})`).join('\n')}

HEAD-TO-HEAD RECORDS:
${headToHead.map(h => `- vs ${h.opponent}: ${h.wins}W-${h.losses}L`).join('\n')}

Provide a JSON response with exactly this structure:
{
  "overall": "2-3 sentence overall assessment of the team",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "trends": "1-2 sentences about current form and trajectory",
  "rivalryInsights": "1 sentence about notable H2H matchups or null if not enough data"
}

Be specific and use the actual stats. Focus on actionable insights for a recreational cornhole league.`;

    console.log('Calling OpenAI with prompt for team:', teamData.team_name);

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

    console.log('Analysis generated successfully for team:', teamData.team_name);

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

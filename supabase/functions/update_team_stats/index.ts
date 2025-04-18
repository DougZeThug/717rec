
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Define the corsHeaders for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get request body
    const { matchId } = await req.json()
    
    if (!matchId) {
      return new Response(
        JSON.stringify({ error: 'Match ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client using the runtime auth from the request
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Fetch the match details
    const { data: match, error: matchError } = await supabaseClient
      .from('matches')
      .select('*, teams_team1:team1_id(*), teams_team2:team2_id(*)')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      console.error('Error fetching match:', matchError)
      return new Response(
        JSON.stringify({ error: 'Match not found', details: matchError }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // If match is not completed, there's no stats to update
    if (!match.iscompleted) {
      return new Response(
        JSON.stringify({ message: 'Match is not completed, no stats to update' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const team1Id = match.team1_id
    const team2Id = match.team2_id
    const winnerId = match.winner_id
    const loserId = match.loser_id
    
    // If no winner and loser are set, we can't update stats
    if (!winnerId || !loserId) {
      return new Response(
        JSON.stringify({ error: 'Match has no winner/loser designated' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse game wins for each team
    const team1GameWins = match.team1_game_wins || 0
    const team2GameWins = match.team2_game_wins || 0

    // Determine which game wins belong to winner/loser
    const winnerGameWins = winnerId === team1Id ? team1GameWins : team2GameWins
    const loserGameWins = loserId === team1Id ? team1GameWins : team2GameWins

    console.log(`Processing match ${matchId}: Winner ${winnerId} (+1 W / +${winnerGameWins} GW), Loser ${loserId} (+1 L / +${loserGameWins} GL)`)

    // Update both teams in a single transaction
    const { data: updateResult, error: updateError } = await supabaseClient.rpc(
      'update_team_stats',
      {
        p_winner_id: winnerId,
        p_loser_id: loserId,
        p_winner_game_wins: winnerGameWins,
        p_loser_game_wins: loserGameWins
      }
    )

    if (updateError) {
      console.error('Error updating team stats:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update team stats', details: updateError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Team stats updated successfully',
        details: {
          winner: { id: winnerId, matchWin: 1, gameWins: winnerGameWins },
          loser: { id: loserId, matchLoss: 1, gameWins: loserGameWins }
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

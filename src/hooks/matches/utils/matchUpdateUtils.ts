
import { supabase } from "@/integrations/supabase/client";
import { MatchResultData } from "../types/matchSubmissionTypes";

export const updateMatchInDatabase = async (
  matchId: string,
  team1Score: number,
  team2Score: number,
  matchResult: MatchResultData
) => {
  const { winnerId, loserId } = matchResult;
  
  const updateData = {
    team1_score: team1Score,
    team2_score: team2Score,
    iscompleted: true,
    winner_id: winnerId,
    loser_id: loserId,
    team1_game_wins: matchResult.team1GameWins,
    team2_game_wins: matchResult.team2GameWins
  };
  
  console.log(`[matchUpdateUtils] Updating match ${matchId} with:`, updateData);
  
  // First update the match itself
  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .update(updateData)
    .eq('id', matchId)
    .select();
    
  if (matchError) {
    console.error(`[matchUpdateUtils] Error updating match ${matchId}:`, matchError);
    throw matchError;
  }

  if (winnerId && loserId) {
    // Update winner stats
    const { data: winner, error: winnerError } = await supabase
      .from('teams')
      .update({
        wins: supabase.sql`wins + 1`,
        game_wins: supabase.sql`game_wins + ${team1Score}`,
        game_losses: supabase.sql`game_losses + ${team2Score}`
      })
      .eq('id', winnerId)
      .select('id');

    if (winnerError) {
      console.error(`[matchUpdateUtils] Error updating winner stats:`, winnerError);
      throw winnerError;
    }

    // Update loser stats
    const { data: loser, error: loserError } = await supabase
      .from('teams')
      .update({
        losses: supabase.sql`losses + 1`,
        game_wins: supabase.sql`game_wins + ${team2Score}`,
        game_losses: supabase.sql`game_losses + ${team1Score}`
      })
      .eq('id', loserId)
      .select('id');

    if (loserError) {
      console.error(`[matchUpdateUtils] Error updating loser stats:`, loserError);
      throw loserError;
    }
  }
  
  console.log(`[matchUpdateUtils] Match ${matchId} updated successfully`);
  return matchData;
};


import { supabase } from "@/integrations/supabase/client";
import { MatchResultData } from "../types/matchSubmissionTypes";

export const updateMatchInDatabase = async (
  matchId: string,
  team1GameWins: number,
  team2GameWins: number,
  matchResult: MatchResultData
) => {
  const { winnerId, loserId } = matchResult;
  
  // Calculate match scores (1 for win, 0 for loss)
  const team1Score = winnerId === matchResult.team1Id ? 1 : 0;
  const team2Score = winnerId === matchResult.team2Id ? 1 : 0;
  
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

  // For completed matches, trigger the team stats update via RPC
  if (winnerId && loserId) {
    try {
      const { data, error } = await supabase.rpc('update_team_stats', {
        p_winner_id: winnerId,
        p_loser_id: loserId,
        p_winner_game_wins: matchResult.team1GameWins,
        p_loser_game_wins: matchResult.team2GameWins
      });
      
      if (error) {
        console.error('[matchUpdateUtils] Error calling update_team_stats RPC:', error);
        throw error;
      }
      
      console.log('[matchUpdateUtils] Team stats update successful:', data);
    } catch (error) {
      console.error(`[matchUpdateUtils] Error updating team stats:`, error);
      throw error;
    }
  }
  
  console.log(`[matchUpdateUtils] Match ${matchId} updated successfully`);
  return matchData;
};

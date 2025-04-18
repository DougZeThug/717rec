
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
  
  const { data, error } = await supabase
    .from('matches')
    .update(updateData)
    .eq('id', matchId)
    .select();
    
  if (error) {
    console.error(`[matchUpdateUtils] Error updating match ${matchId}:`, error);
    throw error;
  }
  
  console.log(`[matchUpdateUtils] Match ${matchId} updated successfully`);
  return data;
};

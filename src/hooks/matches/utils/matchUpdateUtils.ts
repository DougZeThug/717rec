
import { supabase } from "@/integrations/supabase/client";
import { MatchResultData } from "../types/matchSubmissionTypes";
import { applyMatchResult } from "@/hooks/team-stats/utils/teamRecordUtils";

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
    // Determine which team's game score belongs to winner/loser
    const winnerGameWins = winnerId === matchResult.team1Id ? matchResult.team1GameWins : matchResult.team2GameWins;
    const loserGameWins = loserId === matchResult.team1Id ? matchResult.team1GameWins : matchResult.team2GameWins;
    
    try {
      // Use the updated utility to update team records correctly
      await applyMatchResult(
        winnerId,
        loserId,
        winnerGameWins,
        loserGameWins
      );
    } catch (error) {
      console.error(`[matchUpdateUtils] Error updating team stats:`, error);
      throw error;
    }
  }
  
  console.log(`[matchUpdateUtils] Match ${matchId} updated successfully`);
  return matchData;
};

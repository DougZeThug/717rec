
import { useQueryClient } from "@tanstack/react-query";
import { Team } from "@/types";
import { invalidateMatchRelatedQueries } from "../matches/utils/queryCacheUtils";
import { supabase } from "@/integrations/supabase/client";

export const useTeamWinLossUpdate = () => {
  const queryClient = useQueryClient();

  const updateTeamRecords = async (
    winnerId: string, 
    loserId: string, 
    teams: Team[], 
    winnerGameWins: number = 0, 
    loserGameWins: number = 0
  ) => {
    try {
      // Ensure game win values are numbers
      const winnerGameWinsNum = Number(winnerGameWins || 0);
      const loserGameWinsNum = Number(loserGameWins || 0);
      
      console.log(`[useTeamWinLossUpdate] Updating team records:`, {
        match_result: { 
          winnerId, // This team gets exactly ONE match win
          loserId   // This team gets exactly ONE match loss
        }, 
        game_stats: { 
          winner: { id: winnerId, gameWins: winnerGameWinsNum }, // These are game wins, separate from match win
          loser: { id: loserId, gameWins: loserGameWinsNum }     // These are game wins, separate from match loss
        }
      });
      
      // Use the RPC function to update team stats - pass only the IDs and game wins
      // The function should handle +1 match win/loss and the variable game wins correctly
      const { data, error } = await supabase.rpc('update_team_stats', {
        p_winner_id: winnerId,
        p_loser_id: loserId,
        p_winner_game_wins: winnerGameWinsNum,
        p_loser_game_wins: loserGameWinsNum
      });
      
      if (error) {
        console.error("[useTeamWinLossUpdate] Error in update_team_stats RPC:", error);
        return false;
      }
      
      console.log("[useTeamWinLossUpdate] Update successful:", data);
      
      // Invalidate all relevant queries to ensure fresh data
      await invalidateMatchRelatedQueries(queryClient);
      
      return true;
    } catch (error) {
      console.error("Error in updateTeamRecords:", error);
      return false;
    }
  };

  return { updateTeamRecords };
};

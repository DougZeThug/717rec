
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
      // First log what we're about to do for debugging
      console.log(`[useTeamWinLossUpdate] Processing match result:`);
      console.log(`Match Result: Winner ${winnerId} gets +1 match win, Loser ${loserId} gets +1 match loss`);
      console.log(`Game Stats: Winner has ${winnerGameWins} game wins, Loser has ${loserGameWins} game wins`);
      
      // Ensure game win values are numbers
      const winnerGameWinsNum = Number(winnerGameWins || 0);
      const loserGameWinsNum = Number(loserGameWins || 0);
      
      // Call the RPC function - this will add exactly 1 match win/loss and the actual game wins
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
      console.log("[useTeamWinLossUpdate] Verifying records were updated correctly...");
      
      // Fetch updated team records to verify
      const { data: updatedTeams } = await supabase
        .from('teams')
        .select('id, name, wins, losses, game_wins, game_losses')
        .in('id', [winnerId, loserId]);
        
      if (updatedTeams) {
        updatedTeams.forEach(team => {
          console.log(`Team ${team.name} (${team.id}) current records:`, {
            matchRecord: `${team.wins}-${team.losses}`,
            gameRecord: `${team.game_wins}-${team.game_losses}`
          });
        });
      }
      
      // Invalidate all relevant queries to ensure fresh data
      await invalidateMatchRelatedQueries(queryClient);
      
      return true;
    } catch (error) {
      console.error("[useTeamWinLossUpdate] Error in updateTeamRecords:", error);
      return false;
    }
  };

  return { updateTeamRecords };
};

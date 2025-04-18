
import { useQueryClient } from "@tanstack/react-query";
import { Team } from "@/types";
import { applyMatchResult } from "./utils/teamRecordUtils";
import { invalidateMatchRelatedQueries } from "../matches/utils/queryCacheUtils";

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
      
      console.log(`[useTeamWinLossUpdate] Updating team records with game stats:`, {
        winner: { id: winnerId, gameWins: winnerGameWinsNum },
        loser: { id: loserId, gameWins: loserGameWinsNum }
      });
      
      // Update team records with our updated utility function
      await applyMatchResult(
        winnerId,
        loserId,
        winnerGameWinsNum,
        loserGameWinsNum
      );
      
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

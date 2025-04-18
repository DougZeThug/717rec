
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
      // Update team records with our new utility function
      await applyMatchResult(
        winnerId,
        loserId,
        winnerGameWins,
        loserGameWins
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

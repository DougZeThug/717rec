
import { useQueryClient } from "@tanstack/react-query";
import { Team } from "@/types";

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
      // Since the database trigger handles all stat updates,
      // we only need to invalidate the relevant queries
      console.log("Invalidating queries to refresh team stats...");
      
      await queryClient.invalidateQueries({ queryKey: ['teams'] });
      await queryClient.invalidateQueries({ queryKey: ['rankings'] });
      
      return true;
    } catch (error) {
      console.error("Error in updateTeamRecords:", error);
      return false;
    }
  };

  return { updateTeamRecords };
};

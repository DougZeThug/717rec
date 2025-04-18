
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
      // Since we're now handling stats in matchUpdateUtils,
      // we only need to invalidate the relevant queries
      await queryClient.invalidateQueries({ queryKey: ['teams'] });
      await queryClient.invalidateQueries({ queryKey: ['rankings'] });
      await queryClient.invalidateQueries({ queryKey: ['team', winnerId] });
      await queryClient.invalidateQueries({ queryKey: ['team', loserId] });
      
      return true;
    } catch (error) {
      console.error("Error in updateTeamRecords:", error);
      return false;
    }
  };

  return { updateTeamRecords };
};

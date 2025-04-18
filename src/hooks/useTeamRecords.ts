
import { useTeamWinLossUpdate } from "./team-stats/useTeamWinLossUpdate";
import { updateTeamStatsRecord } from "@/services/TeamStatsService";
import { Team } from "@/types";
import { useQueryClient } from "@tanstack/react-query";

export const useTeamRecords = () => {
  const { updateTeamRecords: updateWinLoss } = useTeamWinLossUpdate();
  const queryClient = useQueryClient();

  const updateTeamRecords = async (winnerId: string, loserId: string, teams: Team[]) => {
    // First update the basic win/loss records
    const success = await updateWinLoss(winnerId, loserId, teams);
    if (!success) return false;

    // Then update the detailed team stats
    await updateTeamStatsRecord(winnerId, loserId);
    
    // Invalidate all relevant queries to ensure data freshness across the app
    queryClient.invalidateQueries({ queryKey: ['rankings'] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    queryClient.invalidateQueries({ queryKey: ['teamStats'] });
    queryClient.invalidateQueries({ queryKey: ['team'] });
    queryClient.invalidateQueries({ queryKey: ['team-matches'] });
    
    return true;
  };

  return {
    updateTeamRecords
  };
};

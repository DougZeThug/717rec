
import { useTeamWinLossUpdate } from "./team-stats/useTeamWinLossUpdate";
import { updateTeamStatsRecord } from "@/services/TeamStatsService";
import { Team } from "@/types";

export const useTeamRecords = () => {
  const { updateTeamRecords: updateWinLoss } = useTeamWinLossUpdate();

  const updateTeamRecords = async (winnerId: string, loserId: string, teams: Team[]) => {
    // First update the basic win/loss records
    const success = await updateWinLoss(winnerId, loserId, teams);
    if (!success) return false;

    // Then update the detailed team stats
    await updateTeamStatsRecord(winnerId, loserId);
    
    return true;
  };

  return {
    updateTeamRecords
  };
};

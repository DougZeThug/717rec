
import { Team } from "@/types";
import { applyMatchResult } from "@/hooks/team-stats/utils/teamRecordUtils";

export const updateTeamStatsRecord = async (
  winnerId: string,
  loserId: string,
  teams: Team[],
  winnerGameWins: number = 0,
  loserGameWins: number = 0
) => {
  try {
    const success = await applyMatchResult(
      winnerId,
      loserId,
      winnerGameWins,
      loserGameWins
    );

    if (!success) {
      console.error("Failed to update team statistics");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating team statistics:", error);
    return false;
  }
};

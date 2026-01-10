import { applyMatchResult } from '@/hooks/team-stats/utils/teamRecordUtils';
import { Team } from '@/types';
import { errorLog, teamLog } from '@/utils/logger';

export const updateTeamStatsRecord = async (
  winnerId: string,
  loserId: string,
  teams: Team[],
  winnerGameWins: number = 0,
  loserGameWins: number = 0
) => {
  try {
    // Ensure game wins are integers
    const parsedWinnerGameWins = parseInt(String(winnerGameWins)) || 0;
    const parsedLoserGameWins = parseInt(String(loserGameWins)) || 0;

    teamLog(
      `Updating team stats: Winner (${winnerId}): ${parsedWinnerGameWins} game wins, Loser (${loserId}): ${parsedLoserGameWins} game wins`
    );

    const success = await applyMatchResult(
      winnerId,
      loserId,
      parsedWinnerGameWins,
      parsedLoserGameWins
    );

    if (!success) {
      errorLog('Failed to update team statistics');
      return false;
    }

    return true;
  } catch (error) {
    errorLog('Error updating team statistics:', error);
    return false;
  }
};

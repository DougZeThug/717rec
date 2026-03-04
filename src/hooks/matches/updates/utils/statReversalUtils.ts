import {
  reverseTeamStats as reverseTeamStatsService,
  upsertTeamSeasonStats,
} from '@/services/matches/MatchWriteService';

/**
 * Reverses team statistics for a completed match
 * This is called when:
 * 1. Deleting a completed match
 * 2. Changing the winner of an already-completed match
 * 3. Marking a completed match as incomplete
 *
 * @param winnerId - ID of the team that won
 * @param loserId - ID of the team that lost
 * @param winnerGameWins - Number of game wins by the winner
 * @param loserGameWins - Number of game wins by the loser
 */
export const reverseTeamStats = async (
  winnerId: string,
  loserId: string,
  winnerGameWins: number,
  loserGameWins: number
): Promise<void> => {
  // Call the RPC to reverse team stats
  await reverseTeamStatsService(winnerId, loserId, winnerGameWins, loserGameWins);

  // Refresh team_season_stats to keep career data in sync
  await upsertTeamSeasonStats();
};

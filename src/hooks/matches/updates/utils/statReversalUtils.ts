import { reverseTeamStats as reverseTeamStatsService } from '@/services/matches/MatchWriteService';

/**
 * Reverses team statistics for a completed match.
 * Only decrements teams.wins/losses via RPC.
 * Callers are responsible for calling upsertTeamSeasonStats() separately
 * AFTER the match has been deleted/updated, so season stats recalculate
 * without the removed/changed match.
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
  await reverseTeamStatsService(winnerId, loserId, winnerGameWins, loserGameWins);
};

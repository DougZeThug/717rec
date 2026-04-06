import { supabase } from '@/integrations/supabase/client';
import { ValidationError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { errorLog, scoreLog } from '@/utils/logger';

// Re-export from split services so existing imports keep working
export type { HeadToHeadData } from '@/services/TeamCareerStatsService';
export { fetchBatchHeadToHead } from '@/services/TeamCareerStatsService';
export type { TeamUpdate } from '@/services/TeamSeasonStatsService';
export { batchUpdateSeasonStats, fetchSeasonBreakdown } from '@/services/TeamSeasonStatsService';

// ─── applyMatchResult ─────────────────────────────────────────────────────────

/**
 * Apply a match result by updating team stats via RPC.
 * Also refreshes team_season_stats for historical accuracy.
 */
export async function applyMatchResult(
  winnerId: string,
  loserId: string,
  winnerGameWins: number,
  loserGameWins: number
): Promise<boolean> {
  // Normalize UUIDs to lowercase for case-insensitive comparison
  winnerId = winnerId.toLowerCase();
  loserId = loserId.toLowerCase();

  // Validate that winner and loser are different teams
  if (winnerId === loserId) {
    const errorMsg = 'Winner and loser must be different teams';
    errorLog('Invalid applyMatchResult call - same team ID for winner and loser:', {
      winnerId,
      loserId,
    });
    throw new ValidationError(errorMsg);
  }

  // Convert parameters to numbers to ensure proper math
  const winnerGameWinsNum = Number(winnerGameWins || 0);
  const loserGameWinsNum = Number(loserGameWins || 0);

  scoreLog(
    `Updating stats: winner ${winnerId} (+1W/+${winnerGameWinsNum}GW), loser ${loserId} (+1L/+${loserGameWinsNum}GL)`
  );

  try {
    // Use the RPC function for atomic updates to both teams
    const { error } = await supabase.rpc('update_team_stats', {
      p_winner_id: winnerId,
      p_loser_id: loserId,
      p_winner_game_wins: winnerGameWinsNum,
      p_loser_game_wins: loserGameWinsNum,
    });

    if (error) handleDatabaseError(error, 'Failed to update team stats via RPC');

    scoreLog('Team stats updated successfully');

    // Also refresh team_season_stats for historical accuracy
    const { error: seasonStatsError } = await supabase.rpc('upsert_team_season_stats');
    if (seasonStatsError) handleDatabaseError(seasonStatsError, 'Failed to refresh season stats');

    return true;
  } catch (err) {
    errorLog('Failed to apply match result:', err);
    throw err;
  }
}

// ─── updateTeamStatsRecord ────────────────────────────────────────────────────

export const updateTeamStatsRecord = async (
  winnerId: string,
  loserId: string,
  winnerGameWins: number = 0,
  loserGameWins: number = 0
) => {
  // Ensure game wins are integers
  const parsedWinnerGameWins = parseInt(String(winnerGameWins)) || 0;
  const parsedLoserGameWins = parseInt(String(loserGameWins)) || 0;

  return applyMatchResult(winnerId, loserId, parsedWinnerGameWins, parsedLoserGameWins);
};

import { supabase } from '@/integrations/supabase/client';
import { warnLog } from '@/utils/logger';

/**
 * Reverses team statistics for a completed match
 * This is called when:
 * 1. Deleting a completed match
 * 2. Changing the winner of an already-completed match
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
  const { error: reverseError } = await supabase.rpc('reverse_team_stats', {
    p_winner_id: winnerId,
    p_loser_id: loserId,
    p_winner_game_wins: winnerGameWins,
    p_loser_game_wins: loserGameWins,
  });

  if (reverseError) {
    throw new Error(`Failed to reverse team stats: ${reverseError.message}`);
  }

  // Refresh team_season_stats to keep career data in sync
  const { error: seasonStatsError } = await supabase.rpc('upsert_team_season_stats');
  if (seasonStatsError) {
    warnLog('Failed to refresh season stats after reversal:', seasonStatsError);
  }
};

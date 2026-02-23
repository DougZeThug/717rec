import { supabase } from '@/integrations/supabase/client';
import { errorLog, scoreLog } from '@/utils/logger';

export async function applyMatchResult(
  winnerId: string,
  loserId: string,
  winnerGameWins: number,
  loserGameWins: number
) {
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
    throw new Error(errorMsg);
  }

  // Convert parameters to numbers to ensure proper math
  const winnerGameWinsNum = Number(winnerGameWins || 0);
  const loserGameWinsNum = Number(loserGameWins || 0);

  scoreLog(
    `Updating stats: winner ${winnerId} (+1W/+${winnerGameWinsNum}GW), loser ${loserId} (+1L/+${loserGameWinsNum}GL)`
  );

  try {
    // Use the RPC function for atomic updates to both teams
    const { data, error } = await supabase.rpc('update_team_stats', {
      p_winner_id: winnerId,
      p_loser_id: loserId,
      p_winner_game_wins: winnerGameWinsNum,
      p_loser_game_wins: loserGameWinsNum,
    });

    if (error) {
      errorLog('update_team_stats RPC failed:', error);
      throw error;
    }

    scoreLog('Team stats updated successfully');

    // Also refresh team_season_stats for historical accuracy
    const { error: seasonStatsError } = await supabase.rpc('upsert_team_season_stats');
    if (seasonStatsError) {
      errorLog('Failed to refresh season stats:', seasonStatsError);
      // Non-fatal - continue
    }

    return true;
  } catch (error) {
    errorLog('Failed to update team stats:', error);
    throw error;
  }
}

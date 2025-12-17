
import { supabase } from "@/integrations/supabase/client";
import { scoreLog, errorLog } from "@/utils/logger";

export async function applyMatchResult(
  winnerId: string,
  loserId: string,
  winnerGameWins: number,
  loserGameWins: number
) {
  // Convert parameters to numbers to ensure proper math
  const winnerGameWinsNum = Number(winnerGameWins || 0);
  const loserGameWinsNum = Number(loserGameWins || 0);

  scoreLog(`Updating stats: winner ${winnerId} (+1W/+${winnerGameWinsNum}GW), loser ${loserId} (+1L/+${loserGameWinsNum}GL)`);

  try {
    // Use the RPC function for atomic updates to both teams
    const { data, error } = await supabase.rpc('update_team_stats', {
      p_winner_id: winnerId,
      p_loser_id: loserId,
      p_winner_game_wins: winnerGameWinsNum,
      p_loser_game_wins: loserGameWinsNum
    });

    if (error) {
      errorLog("update_team_stats RPC failed:", error);
      throw error;
    }

    scoreLog("Team stats updated successfully");
    
    return true;
  } catch (error) {
    errorLog("Failed to update team stats:", error);
    throw error;
  }
}

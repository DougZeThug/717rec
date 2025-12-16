
import { teamLog } from "@/utils/logger";

/**
 * Calculate win percentage for a team
 * @param wins Number of wins
 * @param losses Number of losses
 * @returns Win percentage as a decimal (0.0-1.0)
 */
export const calculateWinPercentage = (wins: number, losses: number) => {
  // Parse and ensure we're working with numbers
  const winCount = parseInt(String(wins)) || 0;
  const lossCount = parseInt(String(losses)) || 0;
  
  const totalGames = winCount + lossCount;
  
  // Log the calculation for debugging
  teamLog(`Win percentage calculation: ${winCount} wins, ${lossCount} losses, ${totalGames} total games`);
  const percentage = totalGames > 0 ? winCount / totalGames : 0;
  teamLog(`Calculated win percentage: ${percentage} (${percentage * 100}%)`);
  
  // Return a raw decimal value (not multiplied by 100)
  // Ensure we return exactly 0 when there are no games
  return totalGames > 0 ? winCount / totalGames : 0;
};


/**
 * Calculate win percentage for a team
 * @param wins Number of wins
 * @param losses Number of losses
 * @returns Win percentage as a decimal (0.0-1.0)
 */
export const calculateWinPercentage = (wins: number, losses: number) => {
  // Ensure we're working with numbers
  const winCount = typeof wins === 'number' ? wins : 0;
  const lossCount = typeof losses === 'number' ? losses : 0;
  
  const totalGames = winCount + lossCount;
  
  // Log the calculation for debugging
  console.log(`Win percentage calculation: ${winCount} wins, ${lossCount} losses, ${totalGames} total games`);
  const percentage = totalGames > 0 ? winCount / totalGames : 0;
  console.log(`Calculated win percentage: ${percentage} (${percentage * 100}%)`);
  
  // Return a raw decimal value (not multiplied by 100)
  // Ensure we return exactly 0 when there are no games
  return totalGames > 0 ? winCount / totalGames : 0;
};

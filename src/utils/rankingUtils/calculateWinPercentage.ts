
/**
 * Calculate win percentage for a team
 */
export const calculateWinPercentage = (wins: number, losses: number) => {
  // Ensure we're working with numbers
  const winCount = typeof wins === 'number' ? wins : 0;
  const lossCount = typeof losses === 'number' ? losses : 0;
  
  const totalGames = winCount + lossCount;
  
  // Return a raw decimal value (not multiplied by 100)
  // Ensure we return exactly 0 when there are no games
  return totalGames > 0 ? winCount / totalGames : 0;
};

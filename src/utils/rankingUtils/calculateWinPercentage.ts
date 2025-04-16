
/**
 * Calculate win percentage for a team
 */
export const calculateWinPercentage = (wins: number, losses: number) => {
  const totalGames = wins + losses;
  return totalGames > 0 ? wins / totalGames : 0;
};

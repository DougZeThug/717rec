
export interface MatchValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validate a best-of-X score.
 * @param gameWins1 - games won by team 1
 * @param gameWins2 - games won by team 2
 * @param bestOf    - e.g. 3 (BO3) or 5 (BO5)
 */
export function validateGameScore(
  gameWins1: number,
  gameWins2: number,
  bestOf: number = 3
): MatchValidationResult {
  const totalGames = gameWins1 + gameWins2;
  const maxGames = bestOf;
  const minGamesForWin = Math.ceil(bestOf / 2);
  
  // Check if either team has reached the minimum wins needed
  const team1HasEnoughWins = gameWins1 >= minGamesForWin;
  const team2HasEnoughWins = gameWins2 >= minGamesForWin;
  
  // Both teams can't have enough wins
  if (team1HasEnoughWins && team2HasEnoughWins) {
    return { isValid: false, errorMessage: `Invalid score: both teams can't win in a best of ${bestOf}` };
  }
  
  // At least one team must have enough wins
  if (!team1HasEnoughWins && !team2HasEnoughWins) {
    return { isValid: false, errorMessage: `Invalid score: a team must win at least ${minGamesForWin} games in a best of ${bestOf}` };
  }
  
  // The total games must not exceed the maximum possible for the match format
  if (totalGames > maxGames) {
    return { isValid: false, errorMessage: `Invalid score: total games (${totalGames}) exceeds maximum (${maxGames}) for best of ${bestOf}` };
  }
  
  // Validate the game counts
  const totalGamesResult = team1HasEnoughWins ? 
    (gameWins1 === minGamesForWin && gameWins2 < minGamesForWin) || 
    (gameWins1 > minGamesForWin && totalGames <= maxGames) : 
    (team2HasEnoughWins === minGamesForWin && gameWins1 < minGamesForWin) || 
    (team2HasEnoughWins > minGamesForWin && totalGames <= maxGames);
  
  if (!totalGamesResult) {
    return { isValid: false, errorMessage: `Invalid score combination for best of ${bestOf}` };
  }
  
  return { isValid: true };
}

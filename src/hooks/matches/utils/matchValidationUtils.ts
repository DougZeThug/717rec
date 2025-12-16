
import { validationLog, errorLog, warnLog, debugLog } from "@/utils/logger";

export interface MatchValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validate a best‑of‑X score.
 * @param gameWins1 – games won by team 1
 * @param gameWins2 – games won by team 2
 * @param bestOf    – e.g. 3 (BO3) or 5 (BO5)
 */
export function validateGameScore(
  gameWins1: number,
  gameWins2: number,
  bestOf: number
): MatchValidationResult {
  validationLog(`Validating: ${gameWins1}-${gameWins2} for best of ${bestOf}`);
  
  // Convert to numbers to ensure correct comparison
  gameWins1 = Number(gameWins1);
  gameWins2 = Number(gameWins2);
  bestOf = Number(bestOf);
  
  // Debug early potential issues with the input values
  if (isNaN(gameWins1) || isNaN(gameWins2) || isNaN(bestOf)) {
    errorLog("Validation error: One of the inputs is NaN", {
      gameWins1: { value: gameWins1, type: typeof gameWins1, isNaN: isNaN(gameWins1) },
      gameWins2: { value: gameWins2, type: typeof gameWins2, isNaN: isNaN(gameWins2) },
      bestOf: { value: bestOf, type: typeof bestOf, isNaN: isNaN(bestOf) }
    });
    return { isValid: false, errorMessage: `Invalid numeric values for score validation` };
  }
  
  if (bestOf <= 0) {
    errorLog("Validation error: bestOf must be positive", { bestOf });
    return { isValid: false, errorMessage: `Invalid match format (bestOf: ${bestOf})` };
  }
  
  // Allow selection even if validation would fail
  // We'll just show a warning but not block the selection
  
  const totalGames = gameWins1 + gameWins2;
  const maxGames = bestOf;
  const minGamesForWin = Math.ceil(bestOf / 2);
  
  // Check if either team has reached the minimum wins needed
  const team1HasEnoughWins = gameWins1 >= minGamesForWin;
  const team2HasEnoughWins = gameWins2 >= minGamesForWin;
  
  debugLog(`Validation details:`, {
    totalGames,
    maxGames,
    minGamesForWin,
    team1HasEnoughWins,
    team2HasEnoughWins,
    bestOf,
    gameWins1,
    gameWins2
  });
  
  // Both teams can't have enough wins
  if (team1HasEnoughWins && team2HasEnoughWins) {
    errorLog(`Validation failed: both teams can't win`);
    return { isValid: false, errorMessage: `Invalid score: both teams can't win in a best of ${bestOf}` };
  }
  
  // Allow partially filled data to be selected even if not a valid final score
  // This handles the case where users are in the process of entering scores
  if (gameWins1 === 0 && gameWins2 === 0) {
    // Allow zeros as a temporary state
    debugLog(`Zero scores are allowed temporarily`);
    return { isValid: true };
  }
  
  // The total games must not exceed the maximum possible for the match format
  if (totalGames > maxGames) {
    errorLog(`Validation failed: total games exceeds maximum`);
    return { isValid: false, errorMessage: `Invalid score: total games (${totalGames}) exceeds maximum (${maxGames}) for best of ${bestOf}` };
  }
  
  // At least one team should have enough wins for completion
  if (!team1HasEnoughWins && !team2HasEnoughWins) {
    warnLog(`Warning: neither team has enough wins yet`);
    return { isValid: false, errorMessage: `Incomplete score: a team must win at least ${minGamesForWin} games in a best of ${bestOf}` };
  }
  
  // Validate the game counts - winner must have EXACTLY minGamesForWin (match ends when reached)
  const totalGamesResult = team1HasEnoughWins 
    ? (gameWins1 === minGamesForWin && gameWins2 < minGamesForWin)
    : (team2HasEnoughWins && gameWins2 === minGamesForWin && gameWins1 < minGamesForWin);
  
  if (!totalGamesResult) {
    errorLog(`Validation failed: invalid score combination`);
    return { isValid: false, errorMessage: `Invalid score combination for best of ${bestOf}` };
  }
  
  validationLog(`Validation passed! Score ${gameWins1}-${gameWins2} is valid for best of ${bestOf}`);
  return { isValid: true };
}

/**
 * Enhanced validation that logs the match ID and date for better debugging
 */
export function validateGameScoreWithMetadata(
  gameWins1: number,
  gameWins2: number,
  bestOf: number,
  matchId?: string,
  matchDate?: string
): MatchValidationResult {
  validationLog(`Validating score for match:`, {
    matchId: matchId || 'unknown',
    matchDate: matchDate || 'unknown',
    gameWins1,
    gameWins2,
    bestOf
  });
  
  const result = validateGameScore(gameWins1, gameWins2, bestOf);
  
  validationLog(`Validation result for match ${matchId}:`, {
    isValid: result.isValid,
    errorMessage: result.errorMessage || "No error"
  });
  
  return result;
}

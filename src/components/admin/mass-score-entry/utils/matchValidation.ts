
// This file provides validation functions for match scores and other match data

/**
 * Validates match scores to ensure they are valid numbers
 * @param score1 Team 1 score
 * @param score2 Team 2 score
 * @returns boolean indicating if scores are valid
 */
export const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
  // Binary match scores must be 1 for one team and 0 for the other
  if (score1 === 1 && score2 === 0) return true;
  if (score1 === 0 && score2 === 1) return true;
  return false;
};

/**
 * Validates game wins to ensure they're correctly formatted
 * @param gameWins1 Team 1 game wins
 * @param gameWins2 Team 2 game wins
 * @returns boolean indicating if game wins are valid
 */
export const validateGameWins = (gameWins1?: number | null, gameWins2?: number | null): boolean => {
  // Game wins must be integers and cannot be tied
  if (typeof gameWins1 !== 'number' || typeof gameWins2 !== 'number') return false;
  if (isNaN(gameWins1) || isNaN(gameWins2)) return false;
  if (gameWins1 === gameWins2) return false;
  return true;
};

/**
 * Validates match result including game wins
 * @param team1Score Binary score for team 1 (1=win, 0=loss)
 * @param team2Score Binary score for team 2 (1=win, 0=loss)
 * @param team1GameWins Game wins for team 1
 * @param team2GameWins Game wins for team 2
 * @returns Object with validation result and message
 */
export const validateMatchResult = (
  team1Score?: number | null, 
  team2Score?: number | null,
  team1GameWins?: number | null,
  team2GameWins?: number | null
): { isValid: boolean; message?: string } => {
  // Check binary scores are valid
  if (!validateMatchScores(team1Score, team2Score)) {
    return { isValid: false, message: "Invalid match scores: one team must win" };
  }
  
  // Check game wins are valid
  if (!validateGameWins(team1GameWins, team2GameWins)) {
    return { isValid: false, message: "Invalid game wins: teams cannot tie" };
  }
  
  // Check consistency between match score and game wins
  const team1Won = team1Score === 1;
  const team1HasMoreGameWins = (team1GameWins || 0) > (team2GameWins || 0);
  
  if (team1Won !== team1HasMoreGameWins) {
    return { 
      isValid: false, 
      message: "Inconsistency: match winner must have more game wins" 
    };
  }
  
  return { isValid: true };
};

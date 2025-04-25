
// This file provides validation functions for match scores and other match data

/**
 * Validates match scores to ensure they are valid numbers
 * @param score1 Team 1 score
 * @param score2 Team 2 score
 * @returns boolean indicating if scores are valid
 */
export const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
  console.log("validateMatchScores called with:", { 
    score1, 
    score2, 
    score1Type: typeof score1, 
    score2Type: typeof score2 
  });
  
  // Ensure both scores are numbers and not NaN
  if (score1 === null || score1 === undefined || score2 === null || score2 === undefined) {
    console.log("Score validation failed: null or undefined values");
    return false;
  }
  
  // Convert to numbers to guarantee correct comparison
  const parsedScore1 = Number(score1);
  const parsedScore2 = Number(score2);
  
  if (isNaN(parsedScore1) || isNaN(parsedScore2)) {
    console.log("Score validation failed: NaN values");
    return false;
  }
  
  // Binary match scores must be 1 for one team and 0 for the other
  if (parsedScore1 === 1 && parsedScore2 === 0) return true;
  if (parsedScore1 === 0 && parsedScore2 === 1) return true;
  
  console.log("Score validation failed: invalid score combination", { parsedScore1, parsedScore2 });
  return false;
};

/**
 * Validates game wins to ensure they're correctly formatted
 * @param gameWins1 Team 1 game wins
 * @param gameWins2 Team 2 game wins
 * @returns boolean indicating if game wins are valid
 */
export const validateGameWins = (gameWins1?: number | null, gameWins2?: number | null): boolean => {
  console.log("validateGameWins called with:", { 
    gameWins1, 
    gameWins2, 
    gameWins1Type: typeof gameWins1, 
    gameWins2Type: typeof gameWins2 
  });
  
  // Game wins must be integers
  if (gameWins1 === null || gameWins1 === undefined || gameWins2 === null || gameWins2 === undefined) {
    console.log("Game wins validation failed: null or undefined values");
    return false;
  }
  
  // Convert to numbers to ensure correct comparison
  const parsedGameWins1 = Number(gameWins1);
  const parsedGameWins2 = Number(gameWins2);
  
  if (isNaN(parsedGameWins1) || isNaN(parsedGameWins2)) {
    console.log("Game wins validation failed: NaN values");
    return false;
  }
  
  // Allow interim states where game wins might be equal (0-0)
  // This ensures we don't block the UI for incomplete data entry
  if (parsedGameWins1 === 0 && parsedGameWins2 === 0) {
    console.log("Game wins temporarily valid: both teams have 0 wins");
    return true;
  }
  
  // Game wins cannot be tied (one team must have more wins than the other)
  if (parsedGameWins1 === parsedGameWins2) {
    console.log("Game wins validation failed: tied scores", { parsedGameWins1, parsedGameWins2 });
    return false;
  }
  
  // Game wins must be non-negative
  if (parsedGameWins1 < 0 || parsedGameWins2 < 0) {
    console.log("Game wins validation failed: negative values", { parsedGameWins1, parsedGameWins2 });
    return false;
  }
  
  console.log("Game wins validation passed:", { parsedGameWins1, parsedGameWins2 });
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
  console.log("validateMatchResult called with:", { 
    team1Score, team2Score, team1GameWins, team2GameWins,
    types: {
      team1ScoreType: typeof team1Score,
      team2ScoreType: typeof team2Score,
      team1GameWinsType: typeof team1GameWins,
      team2GameWinsType: typeof team2GameWins
    }
  });
  
  // Allow incomplete scores to be selected (intermediary states)
  if (
    (team1GameWins === 0 && team2GameWins === 0) || 
    (team1Score === 0 && team2Score === 0)
  ) {
    return { isValid: true, message: "Score selection in progress" };
  }
  
  // First ensure the binary scores are valid
  if (!validateMatchScores(team1Score, team2Score)) {
    return { isValid: false, message: "Invalid match scores: one team must win" };
  }
  
  // Convert possible null/undefined to numbers
  const t1GameWins = typeof team1GameWins === 'number' ? team1GameWins : 0;
  const t2GameWins = typeof team2GameWins === 'number' ? team2GameWins : 0;
  
  // Check game wins are valid
  if (!validateGameWins(t1GameWins, t2GameWins)) {
    return { isValid: false, message: "Invalid game wins: teams cannot tie and must have non-negative wins" };
  }
  
  // Check consistency between match score and game wins
  // The team with more game wins must be the match winner
  const team1Won = team1Score === 1;
  const team1HasMoreGameWins = t1GameWins > t2GameWins;
  
  if (team1Won !== team1HasMoreGameWins) {
    return { 
      isValid: false, 
      message: "Inconsistency: match winner must have more game wins" 
    };
  }
  
  console.log("Match result validation passed");
  return { isValid: true };
};

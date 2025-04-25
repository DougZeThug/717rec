// This file provides validation functions for match scores and other match data

/**
 * Validates match scores to ensure they are valid numbers
 * @param score1 Team 1 score
 * @param score2 Team 2 score
 * @returns boolean indicating if scores are valid
 */
export const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
  console.log(`Validating match scores:`, { score1, score2, types: { score1: typeof score1, score2: typeof score2 } });
  
  if (score1 === null || score1 === undefined || score2 === null || score2 === undefined) {
    console.log("Score validation failed: null or undefined values");
    return false;
  }
  
  // Convert to numbers and ensure valid binary scores (0 or 1)
  const parsedScore1 = Number(score1);
  const parsedScore2 = Number(score2);
  
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
  console.log(`Validating game wins:`, { 
    gameWins1, 
    gameWins2, 
    types: { gameWins1: typeof gameWins1, gameWins2: typeof gameWins2 } 
  });
  
  // Allow null/undefined initially - convert to 0
  const wins1 = Number(gameWins1 ?? 0);
  const wins2 = Number(gameWins2 ?? 0);
  
  // Allow 0-0 for initial state
  if (wins1 === 0 && wins2 === 0) {
    console.log("Game wins temporarily valid: both teams have 0 wins");
    return true;
  }
  
  // Ensure positive integers
  if (wins1 < 0 || wins2 < 0 || !Number.isInteger(wins1) || !Number.isInteger(wins2)) {
    console.log("Game wins validation failed: invalid numbers", { wins1, wins2 });
    return false;
  }
  
  // Prevent ties except for 0-0
  if (wins1 === wins2 && wins1 !== 0) {
    console.log("Game wins validation failed: tied non-zero scores", { wins1, wins2 });
    return false;
  }
  
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
  
  // Allow incomplete scores during selection
  const t1GameWins = Number(team1GameWins ?? 0);
  const t2GameWins = Number(team2GameWins ?? 0);
  
  if (t1GameWins === 0 && t2GameWins === 0) {
    return { isValid: true, message: "Score selection in progress" };
  }
  
  if (!validateMatchScores(team1Score, team2Score)) {
    return { isValid: false, message: "Invalid match scores: one team must win" };
  }
  
  if (!validateGameWins(t1GameWins, t2GameWins)) {
    return { isValid: false, message: "Invalid game wins: teams cannot tie and must have non-negative wins" };
  }
  
  // Check consistency between match score and game wins
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

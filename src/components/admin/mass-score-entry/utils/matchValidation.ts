// This file provides validation functions for match scores and other match data

import { debugLog, validationLog } from '@/utils/logger';

/**
 * Validates match scores to ensure they are valid numbers
 * @param score1 Team 1 score
 * @param score2 Team 2 score
 * @returns boolean indicating if scores are valid
 */
export const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
  debugLog(`Validating match scores:`, {
    score1,
    score2,
    types: { score1: typeof score1, score2: typeof score2 },
  });

  if (score1 === null || score1 === undefined || score2 === null || score2 === undefined) {
    debugLog('Score validation failed: null or undefined values');
    return false;
  }

  // Convert to numbers and ensure valid binary scores (0 or 1)
  const parsedScore1 = Number(score1);
  const parsedScore2 = Number(score2);

  debugLog(`Parsed scores:`, {
    parsedScore1,
    parsedScore2,
    types: { parsedScore1: typeof parsedScore1, parsedScore2: typeof parsedScore2 },
  });

  if (parsedScore1 === 1 && parsedScore2 === 0) return true;
  if (parsedScore1 === 0 && parsedScore2 === 1) return true;

  debugLog('Score validation failed: invalid score combination', { parsedScore1, parsedScore2 });
  return false;
};

/**
 * Validates game wins to ensure they're correctly formatted
 * @param gameWins1 Team 1 game wins
 * @param gameWins2 Team 2 game wins
 * @returns boolean indicating if game wins are valid
 */
export const validateGameWins = (gameWins1?: number | null, gameWins2?: number | null): boolean => {
  debugLog(`Validating game wins:`, {
    gameWins1,
    gameWins2,
    types: { gameWins1: typeof gameWins1, gameWins2: typeof gameWins2 },
  });

  // Allow null/undefined initially - convert to 0
  const wins1 = Number(gameWins1 ?? 0);
  const wins2 = Number(gameWins2 ?? 0);

  debugLog(`Normalized game wins:`, {
    wins1,
    wins2,
    types: { wins1: typeof wins1, wins2: typeof wins2 },
  });

  // Allow 0-0 for initial state
  if (wins1 === 0 && wins2 === 0) {
    debugLog('Game wins temporarily valid: both teams have 0 wins');
    return true;
  }

  // Ensure positive integers
  if (wins1 < 0 || wins2 < 0 || !Number.isInteger(wins1) || !Number.isInteger(wins2)) {
    debugLog('Game wins validation failed: invalid numbers', { wins1, wins2 });
    return false;
  }

  // Prevent ties except for 0-0
  if (wins1 === wins2 && wins1 !== 0) {
    debugLog('Game wins validation failed: tied non-zero scores', { wins1, wins2 });
    return false;
  }

  debugLog('Game wins validation passed', { wins1, wins2 });
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
  validationLog('validateMatchResult called with:', {
    team1Score,
    team2Score,
    team1GameWins,
    team2GameWins,
    types: {
      team1ScoreType: typeof team1Score,
      team2ScoreType: typeof team2Score,
      team1GameWinsType: typeof team1GameWins,
      team2GameWinsType: typeof team2GameWins,
    },
  });

  // Allow incomplete scores during selection
  const t1GameWins = Number(team1GameWins ?? 0);
  const t2GameWins = Number(team2GameWins ?? 0);

  debugLog('Normalized game wins in validateMatchResult:', {
    t1GameWins,
    t2GameWins,
    types: { t1GameWinsType: typeof t1GameWins, t2GameWinsType: typeof t2GameWins },
  });

  if (t1GameWins === 0 && t2GameWins === 0) {
    debugLog('Score selection in progress (0-0 game wins)');
    return { isValid: true, message: 'Score selection in progress' };
  }

  if (!validateMatchScores(team1Score, team2Score)) {
    debugLog('Invalid match scores detected');
    return { isValid: false, message: 'Invalid match scores: one team must win' };
  }

  if (!validateGameWins(t1GameWins, t2GameWins)) {
    debugLog('Invalid game wins detected');
    return {
      isValid: false,
      message: 'Invalid game wins: teams cannot tie and must have non-negative wins',
    };
  }

  // Check consistency between match score and game wins
  const team1Won = team1Score === 1;
  const team1HasMoreGameWins = t1GameWins > t2GameWins;

  debugLog('Checking score-game win consistency:', {
    team1Won,
    team1HasMoreGameWins,
    team1Score,
    team2Score,
    t1GameWins,
    t2GameWins,
  });

  if (team1Won !== team1HasMoreGameWins) {
    debugLog('Inconsistency detected: match winner must have more game wins');
    return {
      isValid: false,
      message: 'Inconsistency: match winner must have more game wins',
    };
  }

  validationLog('Match result validation passed');
  return { isValid: true };
};

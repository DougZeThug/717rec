// This file provides validation functions for match scores and other match data

import { debugLog } from '@/utils/logger';

/**
 * Validates match scores to ensure they are valid numbers
 * @param score1 Team 1 score
 * @param score2 Team 2 score
 * @returns boolean indicating if scores are valid
 */
export const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
  debugLog('Validating match scores:', {
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

  debugLog('Parsed scores:', {
    parsedScore1,
    parsedScore2,
    types: { parsedScore1: typeof parsedScore1, parsedScore2: typeof parsedScore2 },
  });

  if (parsedScore1 === 1 && parsedScore2 === 0) return true;
  if (parsedScore1 === 0 && parsedScore2 === 1) return true;

  debugLog('Score validation failed: invalid score combination', { parsedScore1, parsedScore2 });
  return false;
};

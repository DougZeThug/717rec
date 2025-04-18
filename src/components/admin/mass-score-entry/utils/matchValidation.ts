
/**
 * Validates that both scores are valid integers
 */
export const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
  return Number.isInteger(score1) && Number.isInteger(score2);
};


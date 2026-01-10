import { useCallback } from 'react';

import { GameData, ValidationResult } from '../types';
import { calculateTotalScore, validateMatchScores } from '../utils/scoreUtils';

export const useMatchScoreValidation = (
  games: GameData[],
  bestOf: number,
  setValidationError: (error: string | null) => void
) => {
  const validateGameScores = useCallback((): boolean => {
    const validation = validateMatchScores(games, bestOf);

    if (!validation.isValid) {
      setValidationError(validation.errorMessage || 'Invalid score combination');
      return false;
    }

    setValidationError(null);
    return true;
  }, [games, bestOf, setValidationError]);

  return {
    calculateTotalScore: useCallback(() => calculateTotalScore(games), [games]),
    validateGameScores,
  };
};

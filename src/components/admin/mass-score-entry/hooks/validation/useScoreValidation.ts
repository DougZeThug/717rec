
import { useState } from 'react';
import { MatchWithTeams } from '../../types';

export const useScoreValidation = () => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateScores = (team1Score: number, team2Score: number): boolean => {
    return Number.isInteger(team1Score) && Number.isInteger(team2Score);
  };

  const validateGameWins = (team1GameWins: number, team2GameWins: number): boolean => {
    if (team1GameWins === team2GameWins && team1GameWins !== 0) {
      return false;
    }
    return true;
  };

  const clearValidationError = (matchId: string) => {
    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[matchId];
      return next;
    });
  };

  const setValidationError = (matchId: string, error: string) => {
    setValidationErrors(prev => ({
      ...prev,
      [matchId]: error
    }));
  };

  return {
    validationErrors,
    validateScores,
    validateGameWins,
    clearValidationError,
    setValidationError
  };
};

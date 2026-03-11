import { useState } from 'react';

import { useToast } from '@/hooks/useToast';

export const useScoreValidation = () => {
  const { _toast } = useToast();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateScores = (team1Score: number, team2Score: number): boolean => {
    // Scores must be binary (0 or 1) and cannot be tied
    if (![0, 1].includes(team1Score) || ![0, 1].includes(team2Score)) {
      return false;
    }
    return team1Score !== team2Score;
  };

  const validateGameWins = (team1GameWins: number, team2GameWins: number): boolean => {
    // Game wins must be non-negative integers and cannot be tied (except 0-0)
    if (team1GameWins < 0 || team2GameWins < 0) return false;
    if (team1GameWins === team2GameWins && team1GameWins !== 0) return false;

    return true;
  };

  const validateMatch = (match: {
    team1Score: number;
    team2Score: number;
    team1_game_wins: number;
    team2_game_wins: number;
  }): boolean => {
    const team1Score = match.team1Score ?? 0;
    const team2Score = match.team2Score ?? 0;
    const team1_game_wins = match.team1_game_wins ?? 0;
    const team2_game_wins = match.team2_game_wins ?? 0;

    const validMatchScore =
      [0, 1].includes(team1Score) && [0, 1].includes(team2Score) && team1Score !== team2Score;

    const totalGameWins = team1_game_wins + team2_game_wins;
    const validGameWinSum = totalGameWins === 2 || totalGameWins === 3;

    const correctWinner =
      (team1Score === 1 && team1_game_wins >= 2 && team1_game_wins > team2_game_wins) ||
      (team2Score === 1 && team2_game_wins >= 2 && team2_game_wins > team1_game_wins);

    return validMatchScore && validGameWinSum && correctWinner;
  };

  const setValidationError = (matchId: string, message: string) => {
    setValidationErrors((prev) => ({ ...prev, [matchId]: message }));
  };

  const clearValidationError = (matchId: string) => {
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[matchId];
      return newErrors;
    });
  };

  return {
    validationErrors,
    validateScores,
    validateGameWins,
    validateMatch,
    setValidationError,
    clearValidationError,
  };
};

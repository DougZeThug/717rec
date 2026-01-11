import { GameData, ValidationResult } from '../types';

/**
 * Calculates the total score from a list of games
 */
export const calculateTotalScore = (games: GameData[]) => {
  const team1Wins = games.filter((g) => g.team1Score > g.team2Score).length;
  const team2Wins = games.filter((g) => g.team2Score > g.team1Score).length;
  return { team1Wins, team2Wins };
};

/**
 * Validates if the current game scores represent a valid match state
 * based on the bestOf format
 */
export const validateMatchScores = (games: GameData[], bestOf: number): ValidationResult => {
  const { team1Wins, team2Wins } = calculateTotalScore(games);

  // Minimum wins required to win the match
  const minWinsRequired = Math.ceil(bestOf / 2);

  // Both teams can't have enough wins
  if (team1Wins >= minWinsRequired && team2Wins >= minWinsRequired) {
    return {
      isValid: false,
      errorMessage: `Invalid score: both teams can't win in a best of ${bestOf}`,
    };
  }

  // Allow incomplete scores
  if (team1Wins === 0 && team2Wins === 0) {
    return { isValid: true, errorMessage: null };
  }

  // The total games must not exceed the maximum
  const totalGames = games.length;
  if (totalGames > bestOf) {
    return {
      isValid: false,
      errorMessage: `Invalid score: total games (${totalGames}) exceeds maximum (${bestOf})`,
    };
  }

  // Check for valid match completion
  if (team1Wins >= minWinsRequired || team2Wins >= minWinsRequired) {
    return { isValid: true, errorMessage: null };
  }

  return {
    isValid: false,
    errorMessage: `Incomplete score: a team must win at least ${minWinsRequired} games`,
  };
};

/**
 * Determines if more games can be added based on the bestOf format
 * and current game count
 */
export const canAddMoreGames = (games: GameData[], bestOf: number): boolean => {
  return games.length < bestOf;
};

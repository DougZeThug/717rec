import { useToast } from '@/hooks/useToast';

interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export const useScoreValidation = () => {
  const { _toast } = useToast();

  const validateScore = (team1Score: number, team2Score: number): ValidationResult => {
    // Ensure scores are valid numbers
    if (isNaN(team1Score) || isNaN(team2Score)) {
      return { isValid: false, errorMessage: 'Scores must be valid numbers' };
    }

    // Ensure binary scores
    if (![0, 1].includes(team1Score) || ![0, 1].includes(team2Score)) {
      return { isValid: false, errorMessage: 'Match scores must be either 0 (loss) or 1 (win)' };
    }

    // Ensure exactly one winner
    if (team1Score === team2Score) {
      return { isValid: false, errorMessage: 'One team must win the match' };
    }

    return { isValid: true };
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

  return {
    validateScore,
    validateMatch,
  };
};

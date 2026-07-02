interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

const validateTeamStats = (
  winnerId: string,
  loserId: string,
  winnerGameWins: number,
  loserGameWins: number
): ValidationResult => {
  // Ensure both team IDs are provided
  if (!winnerId || !loserId) {
    return {
      isValid: false,
      errorMessage: 'Missing winner or loser ID for team stats update',
    };
  }

  // Ensure game wins are valid numbers (parse first, THEN reject NaN —
  // `|| 0` here would silently turn bad input into 0 and skip the check)
  const parsedWinnerGameWins = parseInt(String(winnerGameWins), 10);
  const parsedLoserGameWins = parseInt(String(loserGameWins), 10);

  if (isNaN(parsedWinnerGameWins) || isNaN(parsedLoserGameWins)) {
    return {
      isValid: false,
      errorMessage: 'Game wins must be valid numbers',
    };
  }

  // Ensure non-negative game wins
  if (parsedWinnerGameWins < 0 || parsedLoserGameWins < 0) {
    return {
      isValid: false,
      errorMessage: 'Game wins cannot be negative',
    };
  }

  return { isValid: true };
};

export const useTeamStatsValidation = () => {
  return { validateTeamStats };
};

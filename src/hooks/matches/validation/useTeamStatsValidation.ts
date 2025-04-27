
import { useToast } from "@/hooks/use-toast";

interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export const useTeamStatsValidation = () => {
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
        errorMessage: "Missing winner or loser ID for team stats update" 
      };
    }

    // Ensure game wins are valid numbers
    const parsedWinnerGameWins = parseInt(String(winnerGameWins)) || 0;
    const parsedLoserGameWins = parseInt(String(loserGameWins)) || 0;
    
    if (isNaN(parsedWinnerGameWins) || isNaN(parsedLoserGameWins)) {
      return { 
        isValid: false, 
        errorMessage: "Game wins must be valid numbers" 
      };
    }

    // Ensure non-negative game wins
    if (parsedWinnerGameWins < 0 || parsedLoserGameWins < 0) {
      return { 
        isValid: false, 
        errorMessage: "Game wins cannot be negative" 
      };
    }

    return { isValid: true };
  };

  return { validateTeamStats };
};

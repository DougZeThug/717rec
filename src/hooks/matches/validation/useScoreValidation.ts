
import { useToast } from "@/hooks/use-toast";

interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export const useScoreValidation = () => {
  const { toast } = useToast();

  const validateScore = (team1Score: number, team2Score: number): ValidationResult => {
    // Ensure scores are valid numbers
    if (isNaN(team1Score) || isNaN(team2Score)) {
      return { isValid: false, errorMessage: "Scores must be valid numbers" };
    }

    // Ensure binary scores
    if (![0, 1].includes(team1Score) || ![0, 1].includes(team2Score)) {
      return { isValid: false, errorMessage: "Match scores must be either 0 (loss) or 1 (win)" };
    }

    // Ensure exactly one winner
    if (team1Score === team2Score) {
      return { isValid: false, errorMessage: "One team must win the match" };
    }

    return { isValid: true };
  };

  return { validateScore };
};

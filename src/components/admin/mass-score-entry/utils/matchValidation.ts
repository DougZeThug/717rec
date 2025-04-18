
import { MatchWithTeams } from "../types";

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
  return (
    Number.isInteger(score1) && 
    Number.isInteger(score2) && 
    score1! >= 0 && 
    score2! >= 0
  );
};

export const validateMatch = (match: MatchWithTeams): ValidationResult => {
  // Check if teams are selected
  if (!match.team1Id || !match.team2Id) {
    return {
      isValid: false,
      errorMessage: "Both teams must be selected"
    };
  }

  // Check if scores are valid integers
  if (!validateMatchScores(match.team1Score, match.team2Score)) {
    return {
      isValid: false,
      errorMessage: "Scores must be valid non-negative numbers"
    };
  }
  
  // Check if trying to mark as completed but scores are the same
  if (match.iscompleted && match.team1Score === match.team2Score) {
    return {
      isValid: false,
      errorMessage: "Completed matches cannot have tied scores"
    };
  }

  return { isValid: true };
};

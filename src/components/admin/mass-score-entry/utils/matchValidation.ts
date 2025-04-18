
import { MatchWithTeams } from "../types";

export const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
  return Number.isInteger(score1) && Number.isInteger(score2);
};

export const validateMatchSubmission = (match: MatchWithTeams): { isValid: boolean; errorMessage?: string } => {
  if (!match.isValid || !match.team1Score || !match.team2Score) {
    return {
      isValid: false,
      errorMessage: "Invalid scores. Please enter valid numbers."
    };
  }
  return { isValid: true };
};

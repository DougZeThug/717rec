
import { MatchWithTeams } from "../types";

export const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
  return Number.isInteger(score1) && Number.isInteger(score2);
};

export const validateMatchSubmission = (match: MatchWithTeams): { isValid: boolean; errorMessage?: string } => {
  // Debug logging to help troubleshoot
  console.log("Validating match:", match.id, {
    team1Score: match.team1Score,
    team2Score: match.team2Score,
    type1: typeof match.team1Score,
    type2: typeof match.team2Score,
    isEdited: match.isEdited,
    isValid: match.isValid
  });
  
  if (!match.isValid) {
    return {
      isValid: false,
      errorMessage: "Invalid scores. Please enter valid numbers."
    };
  }
  
  // Ensure scores are numbers, not strings
  if (typeof match.team1Score !== 'number' || typeof match.team2Score !== 'number') {
    return {
      isValid: false,
      errorMessage: "Scores must be valid numbers."
    };
  }
  
  return { isValid: true };
};

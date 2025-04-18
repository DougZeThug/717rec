
import { MatchWithTeams } from "../types";

export const determineWinner = (match: MatchWithTeams) => {
  // Debug logging to help troubleshoot
  console.log("Determining winner for match:", match.id, {
    team1Score: match.team1Score,
    team2Score: match.team2Score,
    type1: typeof match.team1Score,
    type2: typeof match.team2Score
  });
  
  if (match.team1Score === null || match.team2Score === null) {
    return { winnerId: null, loserId: null };
  }

  if (match.team1Score === match.team2Score) {
    return { winnerId: null, loserId: null };
  }

  if (match.team1Score > match.team2Score) {
    return { winnerId: match.team1Id, loserId: match.team2Id };
  } else {
    return { winnerId: match.team2Id, loserId: match.team1Id };
  }
};

export const validateMatchSubmission = (match: MatchWithTeams): { isValid: boolean; errorMessage?: string } => {
  // Debug logging to help troubleshoot
  console.log("Validating match submission:", match.id, {
    team1Score: match.team1Score,
    team2Score: match.team2Score,
    type1: typeof match.team1Score,
    type2: typeof match.team2Score,
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

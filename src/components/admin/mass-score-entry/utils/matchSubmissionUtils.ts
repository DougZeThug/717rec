
import { MatchWithTeams } from "../types";

export const determineWinner = (match: MatchWithTeams) => {
  if (!match.team1Score && !match.team2Score) {
    return { winnerId: null, loserId: null };
  }

  if (match.team1Score === match.team2Score) {
    return { winnerId: null, loserId: null };
  }

  if (match.team1Score! > match.team2Score!) {
    return { winnerId: match.team1Id, loserId: match.team2Id };
  } else {
    return { winnerId: match.team2Id, loserId: match.team1Id };
  }
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


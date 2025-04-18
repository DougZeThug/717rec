
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

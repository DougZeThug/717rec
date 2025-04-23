
import { MatchResultData } from "../types/matchSubmissionTypes";

export function determineMatchResults(
  team1GameWins: number,
  team2GameWins: number,
  team1Id: string,
  team2Id: string
): MatchResultData {
  const team1Wins = team1GameWins > team2GameWins;
  
  return {
    winnerId: team1Wins ? team1Id : team2Id,
    loserId: team1Wins ? team2Id : team1Id,
    team1GameWins,
    team2GameWins,
    team1Id,
    team2Id
  };
}

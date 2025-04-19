
import { MatchResultData } from "../types/matchSubmissionTypes";

export const determineMatchResults = (
  team1Id: string,
  team2Id: string,
  team1GameWins: number,
  team2GameWins: number
): MatchResultData => {
  let winnerId: string | null = null;
  let loserId: string | null = null;
  
  console.log(`[matchResultUtils] Calculating match result based on game wins - Team1: ${team1GameWins}, Team2: ${team2GameWins}`);
  
  // Ensure scores are treated as numbers
  const team1GameWinsNum = Number(team1GameWins || 0);
  const team2GameWinsNum = Number(team2GameWins || 0);
  
  // Determine match winner and loser based on game wins
  if (team1GameWinsNum > team2GameWinsNum) {
    winnerId = team1Id;
    loserId = team2Id;
  } else if (team2GameWinsNum > team1GameWinsNum) {
    winnerId = team2Id;
    loserId = team1Id;
  }
  
  console.log(`[matchResultUtils] Match result - Winner: ${winnerId}, Loser: ${loserId}`);
  console.log(`[matchResultUtils] Game wins - Team1: ${team1GameWinsNum}, Team2: ${team2GameWinsNum}`);
  
  return {
    winnerId,
    loserId,
    team1GameWins: team1GameWinsNum,
    team2GameWins: team2GameWinsNum,
    team1Id,
    team2Id
  };
};

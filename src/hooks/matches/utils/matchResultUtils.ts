
import { MatchResultData } from "../types/matchSubmissionTypes";

export const determineMatchResults = (
  team1Id: string,
  team2Id: string,
  team1Score: number,
  team2Score: number,
  team1GameWins: number = 0,
  team2GameWins: number = 0
): MatchResultData => {
  let winnerId: string | null = null;
  let loserId: string | null = null;
  
  console.log(`[matchResultUtils] Calculating match result - Team1: ${team1Score}, Team2: ${team2Score}`);
  console.log(`[matchResultUtils] Game wins - Team1: ${team1GameWins}, Team2: ${team2GameWins}`);
  
  // Ensure scores are treated as numbers
  const team1ScoreNum = Number(team1Score);
  const team2ScoreNum = Number(team2Score);
  
  // Determine winner and loser based on scores
  if (team1ScoreNum > team2ScoreNum) {
    winnerId = team1Id;
    loserId = team2Id;
  } else if (team2ScoreNum > team1ScoreNum) {
    winnerId = team2Id;
    loserId = team1Id;
  }
  
  console.log(`[matchResultUtils] Match result - Winner: ${winnerId}, Loser: ${loserId}`);
  
  return {
    winnerId,
    loserId,
    team1GameWins,
    team2GameWins,
    team1Id,
    team2Id
  };
};


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

export interface MatchValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export const validateGameScores = (
  team1GameWins: number, 
  team2GameWins: number, 
  bestOf: number = 3
): MatchValidationResult => {
  const totalGames = team1GameWins + team2GameWins;
  const maxGames = bestOf;
  const minGamesForWin = Math.ceil(bestOf / 2);
  
  // Check if either team has reached the minimum wins needed
  const team1HasEnoughWins = team1GameWins >= minGamesForWin;
  const team2HasEnoughWins = team2GameWins >= minGamesForWin;
  
  // Both teams can't have enough wins
  if (team1HasEnoughWins && team2HasEnoughWins) {
    return { isValid: false, errorMessage: `Invalid score: both teams can't win in a best of ${bestOf}` };
  }
  
  // At least one team must have enough wins
  if (!team1HasEnoughWins && !team2HasEnoughWins) {
    return { isValid: false, errorMessage: `Invalid score: a team must win at least ${minGamesForWin} games in a best of ${bestOf}` };
  }
  
  // The total games must not exceed the maximum possible for the match format
  if (totalGames > maxGames) {
    return { isValid: false, errorMessage: `Invalid score: total games (${totalGames}) exceeds maximum (${maxGames}) for best of ${bestOf}` };
  }
  
  // Validate the game counts
  const totalGamesResult = team1HasEnoughWins ? 
    (team1GameWins === minGamesForWin && team2GameWins < minGamesForWin) || 
    (team1GameWins > minGamesForWin && totalGames <= maxGames) : 
    (team2GameWins === minGamesForWin && team1GameWins < minGamesForWin) || 
    (team2GameWins > minGamesForWin && totalGames <= maxGames);
  
  if (!totalGamesResult) {
    return { isValid: false, errorMessage: `Invalid score combination for best of ${bestOf}` };
  }
  
  return { isValid: true };
};


import { MatchWithTeams } from "../types";
import { validateMatchScores, validateGameWins, validateMatchResult } from "./matchValidation";

/**
 * Validates a match before submission to ensure all required data is present and valid
 * @param match The match object to validate
 * @returns Object with validation result and error message
 */
export const validateMatchSubmission = (match: MatchWithTeams): { isValid: boolean; errorMessage?: string } => {
  if (!match) {
    return { isValid: false, errorMessage: "Match object is missing" };
  }
  
  console.log("🔍 Validating match submission:", {
    matchId: match.id,
    team1Score: match.team1Score,
    team2Score: match.team2Score,
    team1GameWins: match.team1_game_wins,
    team2GameWins: match.team2_game_wins,
    isCompleted: match.iscompleted
  });
  
  // Required fields check
  if (!match.team1Id || !match.team2Id) {
    return { isValid: false, errorMessage: "Match missing team IDs" };
  }
  
  // For completed matches, validate scores and game wins
  if (match.iscompleted) {
    // Validate binary scores (1/0)
    if (!validateMatchScores(match.team1Score, match.team2Score)) {
      return { isValid: false, errorMessage: "Invalid score: One team must win (1-0)" };
    }
    
    // Validate game wins
    const team1GameWins = parseInt(String(match.team1_game_wins)) || 0;
    const team2GameWins = parseInt(String(match.team2_game_wins)) || 0;
    
    if (!validateGameWins(team1GameWins, team2GameWins)) {
      return { isValid: false, errorMessage: "Game wins cannot be equal" };
    }
    
    // Check consistency between match result and game wins
    const team1Won = match.team1Score === 1;
    const team1HasMoreGameWins = team1GameWins > team2GameWins;
    
    if (team1Won !== team1HasMoreGameWins) {
      return { 
        isValid: false, 
        errorMessage: "Match winner must have more game wins" 
      };
    }
  }
  
  return { isValid: true };
};

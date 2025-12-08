import { MatchWithTeams } from "../../types";
import { useSubmissionState } from "../useSubmissionState";
import { validateMatchSubmission } from "../../utils/matchSubmissionUtils";
import { validationLog } from "@/utils/logger";

export const useMatchValidation = () => {
  const { addError } = useSubmissionState();

  const validateMatch = (match: MatchWithTeams) => {
    // Parse game wins as integers
    const team1GameWins = parseInt(String(match.team1_game_wins)) || 0;
    const team2GameWins = parseInt(String(match.team2_game_wins)) || 0;
    
    // Log validation attempt
    console.log(`🔍 DIAGNOSTIC: Validating match before submission:`, {
      matchId: match.id,
      matchDate: match.date,
      team1GameWins,
      team2GameWins,
      team1Score: match.team1Score,
      team2Score: match.team2Score
    });
    
    // Update match object with parsed game wins
    match.team1_game_wins = team1GameWins;
    match.team2_game_wins = team2GameWins;
    
    // Recalculate binary match scores based on game wins
    if (team1GameWins > team2GameWins) {
      match.team1Score = 1;
      match.team2Score = 0;
    } else if (team1GameWins < team2GameWins) {
      match.team1Score = 0;
      match.team2Score = 1;
    } else {
      addError(match.id, "Game wins cannot be tied");
      return false;
    }
    
    const validation = validateMatchSubmission(match);
    if (!validation.isValid) {
      addError(match.id, validation.errorMessage || "Invalid match data");
      return false;
    }
    
    return true;
  };

  return { validateMatch };
};

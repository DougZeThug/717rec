
import { useCallback } from "react";
import { validateGameScore } from "@/hooks/matches/utils/matchValidationUtils";
import { GameData, ValidationResult } from "../types";

export const useMatchScoreValidation = (
  games: GameData[],
  bestOf: number,
  setValidationError: (error: string | null) => void
) => {
  
  const calculateTotalScore = useCallback(() => {
    const team1Wins = games.filter(g => g.team1Score > g.team2Score).length;
    const team2Wins = games.filter(g => g.team2Score > g.team1Score).length;
    return { team1Wins, team2Wins };
  }, [games]);
  
  const validateGameScores = useCallback((): boolean => {
    const { team1Wins, team2Wins } = calculateTotalScore();
    const validation = validateGameScore(team1Wins, team2Wins, bestOf);
    
    if (!validation.isValid) {
      setValidationError(validation.errorMessage || "Invalid score combination");
      return false;
    }
    
    setValidationError(null);
    return true;
  }, [calculateTotalScore, bestOf, setValidationError]);
  
  return {
    calculateTotalScore,
    validateGameScores
  };
};

import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { MatchWithTeams } from "../../types";

export const useScoreValidation = () => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const validateScores = (team1Score: number, team2Score: number): boolean => {
    // Ensure scores are valid numbers
    if (isNaN(team1Score) || isNaN(team2Score)) {
      toast({
        title: "Invalid Score",
        description: "Scores must be valid numbers",
        variant: "destructive"
      });
      return false;
    }

    // Ensure scores are integers
    if (!Number.isInteger(team1Score) || !Number.isInteger(team2Score)) {
      toast({
        title: "Invalid Score",
        description: "Scores must be whole numbers",
        variant: "destructive"
      });
      return false;
    }

    // Validate binary scores (0 or 1)
    if (![0, 1].includes(team1Score) || ![0, 1].includes(team2Score)) {
      toast({
        title: "Invalid Score",
        description: "Match scores must be either 0 (loss) or 1 (win)",
        variant: "destructive"
      });
      return false;
    }

    // Ensure exactly one winner
    if (team1Score === team2Score) {
      toast({
        title: "Invalid Score",
        description: "One team must win the match",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const validateGameWins = (team1GameWins: number, team2GameWins: number): boolean => {
    // Ensure game wins are valid numbers
    if (isNaN(team1GameWins) || isNaN(team2GameWins)) {
      toast({
        title: "Invalid Game Wins",
        description: "Game wins must be valid numbers",
        variant: "destructive"
      });
      return false;
    }

    // Ensure game wins are non-negative integers
    if (!Number.isInteger(team1GameWins) || !Number.isInteger(team2GameWins) || 
        team1GameWins < 0 || team2GameWins < 0) {
      toast({
        title: "Invalid Game Wins",
        description: "Game wins must be positive whole numbers",
        variant: "destructive"
      });
      return false;
    }

    // Prevent ties in game wins
    if (team1GameWins === team2GameWins && team1GameWins !== 0) {
      toast({
        title: "Invalid Game Wins",
        description: "Game wins cannot be tied (except for 0-0)",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  // Comprehensive match validation function
  const validateMatch = (match: MatchWithTeams): boolean => {
    const { team1Score, team2Score, team1_game_wins, team2_game_wins } = match;

    const validMatchScore =
      [0, 1].includes(team1Score) &&
      [0, 1].includes(team2Score) &&
      team1Score !== team2Score;

    const totalGameWins = (team1_game_wins || 0) + (team2_game_wins || 0);
    const validGameWinSum = totalGameWins === 2 || totalGameWins === 3;

    const correctWinner =
      (team1Score === 1 && (team1_game_wins || 0) >= 2 && (team1_game_wins || 0) > (team2_game_wins || 0)) ||
      (team2Score === 1 && (team2_game_wins || 0) >= 2 && (team2_game_wins || 0) > (team1_game_wins || 0));

    return validMatchScore && validGameWinSum && correctWinner;
  };

  const clearValidationError = (matchId: string) => {
    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[matchId];
      return next;
    });
  };

  const setValidationError = (matchId: string, error: string) => {
    setValidationErrors(prev => ({
      ...prev,
      [matchId]: error
    }));
    
    // Show toast for validation error
    toast({
      title: "Validation Error",
      description: error,
      variant: "destructive"
    });
  };

  return {
    validationErrors,
    validateScores,
    validateGameWins,
    validateMatch,
    clearValidationError,
    setValidationError
  };
};

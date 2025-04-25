
import { useState } from "react";
import { MatchWithTeams } from "../types";
import { useScoreValidation } from "./validation/useScoreValidation";
import { useGameWinsHandler } from "./game-wins/useGameWinsHandler";

export const useMatchScores = () => {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const { validationErrors, validateScores, validateGameWins, setValidationError } = useScoreValidation();
  const { handleGameWinsChange: processGameWinsChange } = useGameWinsHandler();

  const handleScoreChange = (index: number, team1Score: number, team2Score: number) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    console.log(`useMatchScores handleScoreChange BEFORE update for match ${match.id}:`, {
      matchId: match.id, 
      previousScores: {
        team1Score: match.team1Score,
        team2Score: match.team2Score
      },
      newScores: {
        team1Score: Number(team1Score),
        team2Score: Number(team2Score)
      }
    });
    
    match.team1Score = Number(team1Score);
    match.team2Score = Number(team2Score);
    match.isEdited = true;
    match.isValid = validateScores(match.team1Score, match.team2Score);
    
    setMatches(newMatches);
  };

  const handleGameWinsChange = (index: number, team1GameWins: number, team2GameWins: number) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    if (!validateGameWins(team1GameWins, team2GameWins)) {
      setValidationError(match.id, "Game wins cannot be tied");
      return;
    }
    
    const updates = processGameWinsChange(match, team1GameWins, team2GameWins);
    Object.assign(match, updates);
    
    setMatches(newMatches);
  };

  const handleMarkCompleted = (index: number, checked: boolean) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    console.log(`🏁 useMatchScores handleMarkCompleted for match ${match.id}:`, {
      matchId: match.id,
      previousCompletedState: match.iscompleted,
      newCompletedState: checked
    });
    
    match.iscompleted = checked;
    match.isEdited = true;
    setMatches(newMatches);
  };

  return {
    matches,
    setMatches,
    validationErrors,
    handleScoreChange,
    handleGameWinsChange,
    handleMarkCompleted
  };
};

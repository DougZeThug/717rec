
import { useState } from "react";
import { MatchWithTeams } from "../types";
import { validateMatchScores } from "../utils/matchValidation";

export const useMatchScores = () => {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);

  const handleScoreChange = (index: number, team1Score: number, team2Score: number) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    match.team1Score = team1Score;
    match.team2Score = team2Score;
    match.isEdited = true;
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
    
    setMatches(newMatches);
  };

  const handleGameWinsChange = (index: number, team1GameWins: number, team2GameWins: number) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    match.team1_game_wins = team1GameWins;
    match.team2_game_wins = team2GameWins;
    match.isEdited = true;
    
    setMatches(newMatches);
  };

  const handleMarkCompleted = (index: number, checked: boolean) => {
    const newMatches = [...matches];
    newMatches[index].iscompleted = checked;
    newMatches[index].isEdited = true;
    setMatches(newMatches);
  };

  return {
    matches,
    setMatches,
    handleScoreChange,
    handleGameWinsChange,
    handleMarkCompleted
  };
};

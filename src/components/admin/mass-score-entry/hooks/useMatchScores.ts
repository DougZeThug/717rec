
import { useState } from "react";
import { MatchWithTeams } from "../types";

export const useMatchScores = () => {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);

  const handleScoreChange = (index: number, team: 'team1' | 'team2', value: string) => {
    const newMatches = [...matches];
    const scoreValue = value === "" ? null : parseInt(value, 10);
    const match = newMatches[index];
    
    if (team === 'team1') {
      match.team1Score = scoreValue;
    } else {
      match.team2Score = scoreValue;
    }

    match.isEdited = true;
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
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
    handleMarkCompleted
  };
};

const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
  return Number.isInteger(score1) && Number.isInteger(score2);
};

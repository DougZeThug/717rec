
import { useState } from "react";
import { MatchWithTeams } from "../../types";
import { validateMatchScores } from "../../utils/matchValidation";

export const useMatchesState = () => {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // This is for the original style (team1/team2 toggle)
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
    loading,
    setLoading,
    submitting,
    setSubmitting,
    handleScoreChange,
    handleMarkCompleted
  };
};

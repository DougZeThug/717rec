
import { MatchWithTeams } from "../types";
import { validateMatchScores } from "../utils/matchValidation";

export const useMatchValidation = () => {
  const handleScoreChange = (
    matches: MatchWithTeams[],
    index: number,
    team: 'team1' | 'team2',
    value: string | number
  ): MatchWithTeams[] => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    // Convert value to number if it's a string
    const scoreValue = typeof value === 'string' 
      ? (value === "" ? null : parseInt(value, 10))
      : value;
    
    if (team === 'team1') {
      match.team1Score = scoreValue;
    } else {
      match.team2Score = scoreValue;
    }

    match.isEdited = true;
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
    
    // Debug logging
    console.log(`Match ${match.id} validation:`, {
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      isValid: match.isValid
    });
    
    return newMatches;
  };

  const handleMarkCompleted = (
    matches: MatchWithTeams[],
    index: number,
    checked: boolean
  ): MatchWithTeams[] => {
    const newMatches = [...matches];
    newMatches[index].iscompleted = checked;
    newMatches[index].isEdited = true;
    return newMatches;
  };

  return {
    handleScoreChange,
    handleMarkCompleted
  };
};

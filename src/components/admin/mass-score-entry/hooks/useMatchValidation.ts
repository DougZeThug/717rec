
import { MatchWithTeams } from "../types";

export const useMatchValidation = () => {
  const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
    return Number.isInteger(score1) && Number.isInteger(score2);
  };

  const handleScoreChange = (
    matches: MatchWithTeams[],
    index: number,
    team: 'team1' | 'team2',
    value: string
  ): MatchWithTeams[] => {
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

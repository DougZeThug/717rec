
import { MatchWithTeams } from "../types";

export const useMatchValidation = () => {
  const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
    return Number.isInteger(score1) && Number.isInteger(score2);
  };

  const handleScoreChange = (
    matches: MatchWithTeams[],
    index: number,
    team1Score: number,
    team2Score: number
  ): MatchWithTeams[] => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    match.team1Score = team1Score;
    match.team2Score = team2Score;
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
    validateMatchScores,
    handleScoreChange,
    handleMarkCompleted
  };
};

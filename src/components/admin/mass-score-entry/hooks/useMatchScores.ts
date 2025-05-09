
import { MatchWithTeams } from "../types";

export const useMatchScores = (
  matches: MatchWithTeams[],
  setMatches: (matches: MatchWithTeams[]) => void
) => {
  const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
    return (score1 !== undefined && score1 !== null) && 
           (score2 !== undefined && score2 !== null);
  };

  const handleScoreChange = (index: number, team1Score: number, team2Score: number) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    if (!match) {
      console.error(`Match at index ${index} not found`);
      return;
    }
    
    match.team1Score = team1Score;
    match.team2Score = team2Score;
    match.isEdited = true;
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
    
    setMatches(newMatches);
  };
  
  const handleGameWinsChange = (index: number, team1GameWins: number, team2GameWins: number) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    if (!match) {
      console.error(`Match at index ${index} not found`);
      return;
    }
    
    match.team1_game_wins = team1GameWins;
    match.team2_game_wins = team2GameWins;
    match.isEdited = true;
    
    setMatches(newMatches);
  };
  
  const handleMarkCompleted = (index: number, checked: boolean) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    if (!match) {
      console.error(`Match at index ${index} not found`);
      return;
    }
    
    match.iscompleted = checked;
    match.isEdited = true;
    
    setMatches(newMatches);
  };

  const validationErrors = matches.reduce((acc, match, index) => {
    if (match.isEdited && !match.isValid) {
      acc[index] = "Invalid score values";
    }
    return acc;
  }, {} as Record<number, string>);

  return {
    handleScoreChange,
    handleGameWinsChange,
    handleMarkCompleted,
    validationErrors
  };
};

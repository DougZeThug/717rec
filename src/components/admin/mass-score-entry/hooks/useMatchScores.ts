import { MatchWithTeams } from "../types";
import { scoreLog, errorLog } from "@/utils/logger";

export const useMatchScores = (
  matches: MatchWithTeams[],
  setMatches: (matches: MatchWithTeams[]) => void
) => {
  const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
    return (score1 !== undefined && score1 !== null) && 
           (score2 !== undefined && score2 !== null);
  };

  const handleScoreChange = (index: number, team1Score: number, team2Score: number) => {
    scoreLog(`handleScoreChange for match at index ${index}`, { team1Score, team2Score });
    
    const newMatches = [...matches];
    const match = newMatches[index];
    
    if (!match) {
      errorLog(`Match at index ${index} not found in array of ${matches.length} matches`);
      return;
    }
    
    match.team1Score = team1Score;
    match.team2Score = team2Score;
    match.isEdited = true;
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
    
    // Score is being manually set, we should consider auto-completing the match
    // but we'll leave that as a separate step for clarity
    
    setMatches(newMatches);
  };
  
  const handleGameWinsChange = (index: number, team1GameWins: number, team2GameWins: number) => {
    scoreLog(`handleGameWinsChange for match at index ${index}`, { team1GameWins, team2GameWins });
    
    const newMatches = [...matches];
    const match = newMatches[index];
    
    if (!match) {
      errorLog(`Match at index ${index} not found in array of ${matches.length} matches`);
      return;
    }
    
    match.team1_game_wins = team1GameWins;
    match.team2_game_wins = team2GameWins;
    match.isEdited = true;
    
    // Update match validity based on game wins
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
    
    setMatches(newMatches);
  };
  
  const handleMarkCompleted = (index: number, checked: boolean) => {
    scoreLog(`handleMarkCompleted for match at index ${index}`, {
      checked,
      matches: matches.length,
      matchExists: Boolean(matches[index])
    });
    
    const newMatches = [...matches];
    const match = newMatches[index];
    
    if (!match) {
      errorLog(`Match at index ${index} not found in array of ${matches.length} matches`);
      return;
    }
    
    scoreLog(`Updating completion status for match ${match.id}`, {
      before: match.iscompleted,
      after: checked
    });
    
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

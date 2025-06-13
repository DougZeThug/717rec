
import { MatchWithTeams } from "../types";

export const useMatchScores = (
  matches: MatchWithTeams[],
  setMatches: (matches: MatchWithTeams[]) => void
) => {
  const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
    return (score1 !== undefined && score1 !== null) && 
           (score2 !== undefined && score2 !== null);
  };

  const handleScoreChange = (originalIndex: number, team1Score: number, team2Score: number) => {
    console.log(`useMatchScores.handleScoreChange for match at original index ${originalIndex}:`, {
      team1Score,
      team2Score
    });
    
    const newMatches = [...matches];
    const match = newMatches[originalIndex];
    
    if (!match) {
      console.error(`Match at original index ${originalIndex} not found in array of ${matches.length} matches`);
      return;
    }
    
    match.team1Score = team1Score;
    match.team2Score = team2Score;
    match.isEdited = true;
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
    
    console.log(`Updated match ${match.id} with scores: ${team1Score}-${team2Score}, valid: ${match.isValid}`);
    
    setMatches(newMatches);
  };
  
  const handleGameWinsChange = (originalIndex: number, team1GameWins: number, team2GameWins: number) => {
    console.log(`useMatchScores.handleGameWinsChange for match at original index ${originalIndex}:`, {
      team1GameWins,
      team2GameWins
    });
    
    const newMatches = [...matches];
    const match = newMatches[originalIndex];
    
    if (!match) {
      console.error(`Match at original index ${originalIndex} not found in array of ${matches.length} matches`);
      return;
    }
    
    match.team1_game_wins = team1GameWins;
    match.team2_game_wins = team2GameWins;
    match.isEdited = true;
    
    // Update match validity based on game wins
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
    
    console.log(`Updated match ${match.id} game wins: ${team1GameWins}-${team2GameWins}`);
    
    setMatches(newMatches);
  };
  
  const handleMarkCompleted = (originalIndex: number, checked: boolean) => {
    console.log(`useMatchScores.handleMarkCompleted for match at original index ${originalIndex}:`, {
      checked,
      matches: matches.length,
      matchExists: Boolean(matches[originalIndex])
    });
    
    const newMatches = [...matches];
    const match = newMatches[originalIndex];
    
    if (!match) {
      console.error(`Match at original index ${originalIndex} not found in array of ${matches.length} matches`);
      return;
    }
    
    console.log(`Updating completion status for match ${match.id}`, {
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

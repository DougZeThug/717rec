
import { MatchWithTeams } from "../types";

export const useMatchScores = (
  matches: MatchWithTeams[],
  setMatches: (matches: MatchWithTeams[]) => void
) => {
  const validateMatchScores = (match: MatchWithTeams): boolean => {
    console.log(`🔍 Validating match ${match.id}:`, {
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      team1GameWins: match.team1_game_wins,
      team2GameWins: match.team2_game_wins,
      iscompleted: match.iscompleted
    });

    // Basic validation: scores must be numbers
    const hasValidScores = 
      match.team1Score !== null && 
      match.team2Score !== null && 
      !isNaN(Number(match.team1Score)) && 
      !isNaN(Number(match.team2Score));

    // Game wins validation
    const hasValidGameWins = 
      match.team1_game_wins !== null && 
      match.team2_game_wins !== null && 
      !isNaN(Number(match.team1_game_wins)) && 
      !isNaN(Number(match.team2_game_wins));

    const isValid = hasValidScores && hasValidGameWins;
    console.log(`✅ Match ${match.id} validation result: ${isValid}`);
    
    return isValid;
  };

  const handleScoreChange = (index: number, team1Score: number, team2Score: number) => {
    console.log(`🎯 Score change for match at index ${index}:`, { team1Score, team2Score });
    
    const newMatches = [...matches];
    const match = newMatches[index];
    
    if (!match) {
      console.error(`❌ Match at index ${index} not found in array of ${matches.length} matches`);
      return;
    }
    
    match.team1Score = team1Score;
    match.team2Score = team2Score;
    match.isEdited = true;
    match.isValid = validateMatchScores(match);
    
    console.log(`📝 Updated match ${match.id}:`, {
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      isEdited: match.isEdited,
      isValid: match.isValid
    });
    
    setMatches(newMatches);
  };
  
  const handleGameWinsChange = (index: number, team1GameWins: number, team2GameWins: number) => {
    console.log(`🎯 Game wins change for match at index ${index}:`, { team1GameWins, team2GameWins });
    
    const newMatches = [...matches];
    const match = newMatches[index];
    
    if (!match) {
      console.error(`❌ Match at index ${index} not found in array of ${matches.length} matches`);
      return;
    }
    
    match.team1_game_wins = team1GameWins;
    match.team2_game_wins = team2GameWins;
    match.isEdited = true;
    match.isValid = validateMatchScores(match);
    
    console.log(`📝 Updated match ${match.id} game wins:`, {
      team1GameWins: match.team1_game_wins,
      team2GameWins: match.team2_game_wins,
      isEdited: match.isEdited,
      isValid: match.isValid
    });
    
    setMatches(newMatches);
  };
  
  const handleMarkCompleted = (index: number, checked: boolean) => {
    console.log(`🎯 Completion change for match at index ${index}:`, { checked });
    
    const newMatches = [...matches];
    const match = newMatches[index];
    
    if (!match) {
      console.error(`❌ Match at index ${index} not found in array of ${matches.length} matches`);
      return;
    }
    
    match.iscompleted = checked;
    match.isEdited = true;
    
    console.log(`📝 Updated match ${match.id} completion:`, {
      iscompleted: match.iscompleted,
      isEdited: match.isEdited
    });
    
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

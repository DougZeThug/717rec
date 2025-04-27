
import { MatchWithTeams } from "../types";
import { useScoreValidation } from "./validation/useScoreValidation";
import { useGameWinsHandler } from "./game-wins/useGameWinsHandler";

export const useMatchScores = (matches: MatchWithTeams[], setMatches: React.Dispatch<React.SetStateAction<MatchWithTeams[]>>) => {
  const { validationErrors, validateScores, validateGameWins, validateMatch, setValidationError } = useScoreValidation();
  const { handleGameWinsChange: processGameWinsChange } = useGameWinsHandler();

  const handleScoreChange = (index: number, team1Score: number, team2Score: number) => {
    const newMatches = [...matches]; // Create a new array reference
    const match = newMatches[index];
    
    console.log(`useMatchScores handleScoreChange BEFORE update for match ${match.id}:`, {
      matchId: match.id, 
      previousScores: {
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        iscompleted: match.iscompleted
      },
      newScores: {
        team1Score: Number(team1Score),
        team2Score: Number(team2Score)
      }
    });
    
    // Update scores and mark as edited and completed
    match.team1Score = Number(team1Score);
    match.team2Score = Number(team2Score);
    match.isEdited = true;
    match.iscompleted = true; // Always mark as completed when score is changed
    
    // Validate the match after updating scores
    match.isValid = validateMatch(match);
    
    console.log(`useMatchScores handleScoreChange AFTER update for match ${match.id}:`, {
      updatedScores: {
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        iscompleted: match.iscompleted
      },
      isValid: match.isValid
    });
    
    // Use setMatches with the new array to trigger re-render
    setMatches(newMatches);
  };

  const handleGameWinsChange = (index: number, team1GameWins: number, team2GameWins: number) => {
    const newMatches = [...matches]; // Create a new array reference
    const match = newMatches[index];
    
    // Convert inputs to numbers to ensure consistency
    const numericTeam1GameWins = Number(team1GameWins);
    const numericTeam2GameWins = Number(team2GameWins);
    
    console.log(`useMatchScores handleGameWinsChange BEFORE update for match ${match.id}:`, {
      matchId: match.id,
      previousGameWins: {
        team1_game_wins: match.team1_game_wins,
        team2_game_wins: match.team2_game_wins
      },
      newGameWins: {
        team1GameWins: numericTeam1GameWins,
        team2GameWins: numericTeam2GameWins
      }
    });
    
    if (!validateGameWins(numericTeam1GameWins, numericTeam2GameWins)) {
      setValidationError(match.id, "Game wins cannot be tied");
      return;
    }
    
    const updates = processGameWinsChange(match, numericTeam1GameWins, numericTeam2GameWins);
    Object.assign(match, updates);
    
    // Always validate the match after game wins are updated
    match.isValid = validateMatch(match);
    
    console.log(`useMatchScores handleGameWinsChange AFTER update for match ${match.id}:`, {
      updatedMatch: {
        team1_game_wins: match.team1_game_wins,
        team2_game_wins: match.team2_game_wins,
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        isValid: match.isValid
      }
    });
    
    // Use setMatches with the new array to trigger re-render
    setMatches(newMatches);
  };

  const handleMarkCompleted = (index: number, checked: boolean) => {
    const newMatches = [...matches]; // Create a new array reference
    const match = newMatches[index];
    
    console.log(`🏁 useMatchScores handleMarkCompleted for match ${match.id}:`, {
      matchId: match.id,
      previousCompletedState: match.iscompleted,
      newCompletedState: checked
    });
    
    match.iscompleted = checked;
    match.isEdited = true;
    
    // Re-validate when completion status changes
    match.isValid = validateMatch(match);
    
    // Use setMatches with the new array to trigger re-render
    setMatches(newMatches);
  };

  return {
    validationErrors,
    handleScoreChange,
    handleGameWinsChange,
    handleMarkCompleted
  };
};

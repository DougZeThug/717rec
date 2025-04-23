
import { useState } from "react";
import { MatchWithTeams } from "../types";
import { validateMatchScores } from "../utils/matchValidation";

export const useMatchScores = () => {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);

  const handleScoreChange = (index: number, team1Score: number, team2Score: number) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    // Set binary match scores (1/0 to indicate win/loss)
    match.team1Score = team1Score;
    match.team2Score = team2Score;
    match.isEdited = true;
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
    
    console.log(`🏆 useMatchScores handleScoreChange for match ${match.id}:`, {
      team1Score,
      team2Score
    });
    
    setMatches(newMatches);
  };

  const handleGameWinsChange = (index: number, team1GameWins: number, team2GameWins: number) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    // Ensure we store integer values for game wins
    match.team1_game_wins = parseInt(String(team1GameWins)) || 0;
    match.team2_game_wins = parseInt(String(team2GameWins)) || 0;
    match.isEdited = true;
    
    console.log(`🎮 useMatchScores handleGameWinsChange for match ${match.id}:`, {
      team1GameWins: match.team1_game_wins,
      team2GameWins: match.team2_game_wins
    });
    
    // Calculate binary match scores based on game wins
    // This ensures consistency between game wins and match scores
    if (match.team1_game_wins > match.team2_game_wins) {
      match.team1Score = 1;
      match.team2Score = 0;
    } else if (match.team1_game_wins < match.team2_game_wins) {
      match.team1Score = 0;
      match.team2Score = 1;
    }
    
    // Revalidate match with updated scores
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
    handleGameWinsChange,
    handleMarkCompleted
  };
};

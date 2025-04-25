
import { useState } from "react";
import { MatchWithTeams } from "../types";
import { validateMatchScores } from "../utils/matchValidation";

export const useMatchScores = () => {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);

  const handleScoreChange = (index: number, team1Score: number, team2Score: number) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    console.log(`🏆 useMatchScores handleScoreChange BEFORE update for match ${match.id}:`, {
      matchId: match.id, 
      matchDate: match.date,
      dateType: typeof match.date,
      previousScores: {
        team1Score: match.team1Score,
        team2Score: match.team2Score
      },
      newScores: {
        team1Score,
        team2Score
      },
      match: {
        ...match,
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        team1_game_wins: match.team1_game_wins,
        team2_game_wins: match.team2_game_wins
      }
    });
    
    // Set binary match scores (1/0 to indicate win/loss)
    match.team1Score = team1Score;
    match.team2Score = team2Score;
    match.isEdited = true;
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
    
    console.log(`🏆 useMatchScores handleScoreChange AFTER update for match ${match.id}:`, {
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      isEdited: match.isEdited,
      isValid: match.isValid
    });
    
    setMatches(newMatches);
  };

  const handleGameWinsChange = (index: number, team1GameWins: number, team2GameWins: number) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    console.log(`🎮 useMatchScores handleGameWinsChange BEFORE update for match ${match.id}:`, {
      matchId: match.id,
      matchDate: match.date,
      dateType: typeof match.date,
      previousGameWins: {
        team1_game_wins: match.team1_game_wins,
        team2_game_wins: match.team2_game_wins
      },
      newGameWins: {
        team1GameWins,
        team2GameWins
      },
      match: {
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        team1_game_wins: match.team1_game_wins,
        team2_game_wins: match.team2_game_wins,
        isEdited: match.isEdited,
        isValid: match.isValid
      }
    });
    
    // Ensure we store integer values for game wins
    match.team1_game_wins = parseInt(String(team1GameWins)) || 0;
    match.team2_game_wins = parseInt(String(team2GameWins)) || 0;
    match.isEdited = true;
    
    console.log(`🎮 useMatchScores handleGameWinsChange AFTER update for match ${match.id}:`, {
      team1_game_wins: match.team1_game_wins,
      team2_game_wins: match.team2_game_wins,
      team1_game_wins_type: typeof match.team1_game_wins,
      team2_game_wins_type: typeof match.team2_game_wins
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
    
    console.log(`🎮 useMatchScores final match state after gameWinsChange for match ${match.id}:`, {
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      team1_game_wins: match.team1_game_wins,
      team2_game_wins: match.team2_game_wins,
      isEdited: match.isEdited,
      isValid: match.isValid
    });
    
    setMatches(newMatches);
  };

  const handleMarkCompleted = (index: number, checked: boolean) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    console.log(`🏁 useMatchScores handleMarkCompleted for match ${match.id}:`, {
      matchId: match.id,
      matchDate: match.date,
      dateType: typeof match.date,
      previousCompletedState: match.iscompleted,
      newCompletedState: checked,
      scores: {
        team1Score: match.team1Score,
        team2Score: match.team2Score
      },
      gameWins: {
        team1_game_wins: match.team1_game_wins,
        team2_game_wins: match.team2_game_wins
      }
    });
    
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

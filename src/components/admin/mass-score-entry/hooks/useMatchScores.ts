import { useState } from "react";
import { MatchWithTeams } from "../types";
import { validateMatchScores } from "../utils/matchValidation";

export const useMatchScores = () => {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);

  const handleScoreChange = (index: number, team1Score: number, team2Score: number) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    console.log(`useMatchScores handleScoreChange BEFORE update for match ${match.id}:`, {
      matchId: match.id, 
      matchDate: match.date,
      dateType: typeof match.date,
      previousScores: {
        team1Score: match.team1Score,
        team2Score: match.team2Score
      },
      newScores: {
        team1Score: Number(team1Score),
        team2Score: Number(team2Score)
      }
    });
    
    // Set binary match scores (1/0 to indicate win/loss)
    match.team1Score = Number(team1Score);
    match.team2Score = Number(team2Score);
    match.isEdited = true;
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
    
    setMatches(newMatches);
  };

  const handleGameWinsChange = (index: number, team1GameWins: number, team2GameWins: number) => {
    const newMatches = [...matches];
    const match = newMatches[index];
    
    // Ensure numeric game wins
    const numericTeam1GameWins = Number(team1GameWins);
    const numericTeam2GameWins = Number(team2GameWins);
    
    console.log(`useMatchScores handleGameWinsChange for match ${match.id}:`, {
      matchId: match.id,
      matchDate: match.date,
      dateType: typeof match.date,
      previousGameWins: {
        team1_game_wins: match.team1_game_wins,
        team2_game_wins: match.team2_game_wins
      },
      newGameWins: {
        team1GameWins: numericTeam1GameWins,
        team2GameWins: numericTeam2GameWins
      }
    });
    
    match.team1_game_wins = numericTeam1GameWins;
    match.team2_game_wins = numericTeam2GameWins;
    
    // Calculate binary match scores based on game wins
    if (numericTeam1GameWins > numericTeam2GameWins) {
      match.team1Score = 1;
      match.team2Score = 0;
    } else if (numericTeam1GameWins < numericTeam2GameWins) {
      match.team1Score = 0;
      match.team2Score = 1;
    } else {
      console.warn(`Game wins cannot be tied for match ${match.id}:`, {
        team1GameWins: numericTeam1GameWins,
        team2GameWins: numericTeam2GameWins
      });
      // Keep previous scores in case of tie
      return;
    }
    
    match.isEdited = true;
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
    
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

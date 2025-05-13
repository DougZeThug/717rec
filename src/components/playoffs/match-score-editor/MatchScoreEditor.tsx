
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import type { PlayoffMatch, Team } from "@/types";
import { validateGameScore } from "@/hooks/matches/utils/matchValidationUtils";
import { ChallongeService } from "@/services/ChallongeService";
import GameScoreRow from "./GameScoreRow";
import GamesList from "./GamesList";
import MatchScoreActions from "./MatchScoreActions";

interface MatchScoreEditorProps {
  match: PlayoffMatch;
  teams: Team[];
  onSave: (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number; }[],
    team1GameWins: number,
    team2GameWins: number
  ) => Promise<void>;
  onCancel: () => void;
  challongeTournamentId?: string | null;
  challongeMatchId?: string | null;
}

const MatchScoreEditor: React.FC<MatchScoreEditorProps> = ({
  match,
  teams,
  onSave,
  onCancel,
  challongeTournamentId,
  challongeMatchId
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [games, setGames] = useState<{ team1Score: number; team2Score: number; }[]>(
    match.games && match.games.length > 0
      ? match.games.map(game => ({
          team1Score: game.team1Score,
          team2Score: game.team2Score
        }))
      : [{ team1Score: 0, team2Score: 0 }]
  );

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  
  const handleGameScoreChange = (index: number, team: 1 | 2, score: number) => {
    const newGames = [...games];
    if (team === 1) {
      newGames[index].team1Score = score;
    } else {
      newGames[index].team2Score = score;
    }
    setGames(newGames);
    validateGameScores();
  };
  
  const addGame = () => {
    setGames([...games, { team1Score: 0, team2Score: 0 }]);
  };
  
  const removeGame = (index: number) => {
    if (games.length <= 1) return;
    const newGames = [...games];
    newGames.splice(index, 1);
    setGames(newGames);
    validateGameScores();
  };
  
  const calculateTotalScore = () => {
    const team1Wins = games.filter(g => g.team1Score > g.team2Score).length;
    const team2Wins = games.filter(g => g.team2Score > g.team1Score).length;
    return { team1Wins, team2Wins };
  };
  
  const validateGameScores = () => {
    const { team1Wins, team2Wins } = calculateTotalScore();
    const validation = validateGameScore(team1Wins, team2Wins, match.bestOf);
    
    if (!validation.isValid) {
      setValidationError(validation.errorMessage || "Invalid score combination");
      return false;
    }
    
    setValidationError(null);
    return true;
  };
  
  const handleSave = async () => {
    if (!validateGameScores()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      const { team1Wins, team2Wins } = calculateTotalScore();
      
      const team1Score = team1Wins > team2Wins ? 1 : 0;
      const team2Score = team2Wins > team1Wins ? 1 : 0;
      
      // Update Challonge if we have the necessary IDs
      if (challongeTournamentId && challongeMatchId) {
        try {
          // Create scores CSV string - format: "team1score-team2score,team1score-team2score"
          const scoresCsv = games.map(game => `${game.team1Score}-${game.team2Score}`).join(',');
          
          // Calculate the winner ID for Challonge
          const winnerId = team1Wins > team2Wins 
            ? match.team1ChallongeId 
            : team2Wins > team1Wins 
              ? match.team2ChallongeId 
              : undefined;
              
          const loserId = team1Wins > team2Wins 
            ? match.team2ChallongeId 
            : team2Wins > team1Wins 
              ? match.team1ChallongeId 
              : undefined;
          
          if (winnerId) {
            await ChallongeService.updateMatch({
              tournamentId: challongeTournamentId,
              matchId: challongeMatchId,
              scoresCsv: scoresCsv,
              winnerId: winnerId.toString(),
              loserId: loserId?.toString(),
            });
            console.log("Challonge match updated successfully");
          }
        } catch (error) {
          console.error("Error updating Challonge match:", error);
          // Continue with local update even if Challonge update fails
        }
      }
      
      // Pass the game win counts to onSave
      await onSave(match.id, team1Score, team2Score, games, team1Wins, team2Wins);
      onCancel();
    } catch (error) {
      console.error("Error saving match scores:", error);
      setValidationError("Failed to save match scores");
    } finally {
      setIsSubmitting(false);
    }
  };

  const { team1Wins, team2Wins } = calculateTotalScore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">
          {team1?.name || "TBD"} vs {team2?.name || "TBD"}
        </div>
        <div className="text-sm text-gray-500">
          {match.matchType} Round {match.round}
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="text-sm font-medium mb-2">Game Scores (Best of {match.bestOf})</div>
        
        {games.map((game, index) => (
          <GameScoreRow
            key={index}
            index={index}
            game={game}
            team1={team1}
            team2={team2}
            onScoreChange={handleGameScoreChange}
            onRemoveGame={removeGame}
            canRemove={games.length > 1}
          />
        ))}
        
        {validationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm flex items-start">
            <AlertCircle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
        
        <MatchScoreActions
          onAddGame={addGame}
          onSave={handleSave}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          hasValidationError={!!validationError}
          canAddGames={games.length < match.bestOf}
          team1Wins={team1Wins}
          team2Wins={team2Wins}
        />
      </div>
    </div>
  );
};

export default MatchScoreEditor;

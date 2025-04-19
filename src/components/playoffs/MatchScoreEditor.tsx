import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, MinusCircle, Save, AlertCircle } from "lucide-react";
import type { PlayoffMatch, Team } from "@/types";
import { validateGameScore } from "@/hooks/matches/utils/matchValidationUtils";

interface MatchScoreEditorProps {
  match: PlayoffMatch;
  teams: Team[];
  onSave: (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number; }[]
  ) => Promise<void>;
  onCancel: () => void;
}

const MatchScoreEditor: React.FC<MatchScoreEditorProps> = ({
  match,
  teams,
  onSave,
  onCancel
}) => {
  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  
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
      
      console.log(`Saving playoff match ${match.id}:`);
      console.log(`- Match result: ${team1Score}-${team2Score}`);
      console.log(`- Game wins: ${team1Wins}-${team2Wins}`);
      
      await onSave(match.id, team1Score, team2Score, games);
      onCancel();
    } catch (error) {
      console.error("Error saving match scores:", error);
      setValidationError("Failed to save match scores");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div key={index} className="flex items-center space-x-2 mb-3">
            <div className="flex-1">
              <Label htmlFor={`team1-game-${index}`} className="text-xs">
                {team1?.name || "Team 1"}
              </Label>
              <Input
                id={`team1-game-${index}`}
                type="number"
                min="0"
                value={game.team1Score}
                onChange={(e) => handleGameScoreChange(index, 1, parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            
            <div className="flex items-center justify-center h-full pt-4">
              <span className="text-gray-500">vs</span>
            </div>
            
            <div className="flex-1">
              <Label htmlFor={`team2-game-${index}`} className="text-xs">
                {team2?.name || "Team 2"}
              </Label>
              <Input
                id={`team2-game-${index}`}
                type="number"
                min="0"
                value={game.team2Score}
                onChange={(e) => handleGameScoreChange(index, 2, parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeGame(index)}
              disabled={games.length <= 1}
              className="mt-4"
            >
              <MinusCircle className="h-5 w-5 text-red-500" />
            </Button>
          </div>
        ))}
        
        {validationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm flex items-start">
            <AlertCircle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
        
        <div className="flex justify-between items-center mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addGame}
            disabled={games.length >= match.bestOf}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Add Game
          </Button>
          
          <div className="text-sm">
            Score: <span className="font-bold">{calculateTotalScore().team1Wins} - {calculateTotalScore().team2Wins}</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-2 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSubmitting || !!validationError}>
          {isSubmitting ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-1" />
              Save Scores
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default MatchScoreEditor;

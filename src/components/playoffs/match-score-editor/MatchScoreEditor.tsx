
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import GamesList from './GamesList';
import { PlayoffGame } from '@/types';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';

interface MatchScoreEditorProps {
  matchId: string;
  bracketId: string;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  bestOf: number;
  onClose?: () => void;
  onSaveSuccess?: () => void;
}

const MatchScoreEditor: React.FC<MatchScoreEditorProps> = ({
  matchId,
  bracketId,
  team1Id,
  team2Id,
  team1Name,
  team2Name,
  bestOf,
  onClose,
  onSaveSuccess
}) => {
  const [games, setGames] = useState<PlayoffGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Generate initial games on component mount
  useEffect(() => {
    // Create empty games based on bestOf count
    const initialGames = Array.from({ length: bestOf }, (_, i) => ({
      id: nanoid(),
      matchId,
      gameNumber: i + 1,
      team1Score: 0,
      team2Score: 0,
      winnerId: null
    }));
    
    setGames(initialGames);
  }, [bestOf, matchId]);

  // Calculate the match result based on games
  const calculateMatchResult = () => {
    let team1Wins = 0;
    let team2Wins = 0;
    
    games.forEach(game => {
      if (game.team1Score > game.team2Score) {
        team1Wins++;
      } else if (game.team2Score > game.team1Score) {
        team2Wins++;
      }
    });
    
    const winThreshold = Math.ceil(bestOf / 2);
    let winnerId = null;
    let loserId = null;
    
    if (team1Wins >= winThreshold) {
      winnerId = team1Id;
      loserId = team2Id;
    } else if (team2Wins >= winThreshold) {
      winnerId = team2Id;
      loserId = team1Id;
    }
    
    return {
      team1Score: team1Wins,
      team2Score: team2Wins,
      winnerId,
      loserId,
      complete: team1Wins >= winThreshold || team2Wins >= winThreshold
    };
  };

  // Validate if all games have valid scores
  const validateGames = () => {
    for (const game of games) {
      // For each completed game, there should be a winner
      if (game.team1Score === game.team2Score && (game.team1Score > 0 || game.team2Score > 0)) {
        return "Games cannot end in a tie. Please fix the score entries.";
      }
    }
    
    const result = calculateMatchResult();
    if (!result.complete) {
      return "Match is incomplete. One team needs to win majority of games.";
    }
    
    return null;
  };

  // Handle save button click
  const handleSave = async () => {
    const validationError = validateGames();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const result = calculateMatchResult();
      
      console.log("Saving match result:", {
        matchId,
        winnerId: result.winnerId,
        loserId: result.loserId,
        team1Score: result.team1Score,
        team2Score: result.team2Score,
        games
      });
      
      // In a real implementation, this would be an API call to save the results
      // await saveMatchResult(matchId, result.winnerId, result.loserId, result.team1Score, result.team2Score, games);
      
      if (onSaveSuccess) {
        onSaveSuccess();
      }
      
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error("Failed to save match result:", err);
      setError("Failed to save match result. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-center">
        Match Score Editor
      </h2>
      
      <div className="flex items-center justify-center gap-3 text-base font-medium">
        <span>{team1Name}</span>
        <span className="text-gray-400">vs</span>
        <span>{team2Name}</span>
      </div>
      
      <div className={cn(
        "p-2 text-center text-xs rounded-md",
        "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
      )}>
        Best of {bestOf} series - First to win {Math.ceil(bestOf / 2)} games wins the match
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <GamesList
        games={games}
        setGames={setGames}
        team1Name={team1Name}
        team2Name={team2Name}
      />
      
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isLoading || isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Match Result
        </Button>
      </div>
    </div>
  );
};

export default MatchScoreEditor;

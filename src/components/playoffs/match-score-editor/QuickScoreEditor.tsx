
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface QuickScoreEditorProps {
  matchId: string;
  bracketId: string;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  onClose?: () => void;
  onSaveSuccess?: () => void;
}

interface ScoreResult {
  team1Score: number;
  team2Score: number;
  games: any[];
}

const QuickScoreEditor: React.FC<QuickScoreEditorProps> = ({
  matchId,
  bracketId,
  team1Id,
  team2Id,
  team1Name,
  team2Name,
  onClose,
  onSaveSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle quick score submission
  const handleQuickScore = async (team1Wins: number, team2Wins: number) => {
    setIsSubmitting(true);
    setError(null);
    
    // Generate sample game scores based on the chosen result
    const sampleGames = generateSampleGames(matchId, team1Wins, team2Wins);
    
    const result = {
      team1Score: team1Wins,
      team2Score: team2Wins,
      winnerId: team1Wins > team2Wins ? team1Id : team2Id,
      loserId: team1Wins > team2Wins ? team2Id : team1Id,
      games: sampleGames
    };
    
    try {
      console.log("Submitting quick score:", result);
      
      // In a real implementation, this would call an API
      // await saveMatchResult(matchId, result.winnerId, result.loserId, team1Wins, team2Wins, sampleGames);
      
      if (onSaveSuccess) {
        onSaveSuccess();
      }
      
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error("Failed to submit score:", err);
      setError("Failed to save match result. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate plausible game scores for the reported match result
  const generateSampleGames = (matchId: string, team1Wins: number, team2Wins: number) => {
    const games = [];
    
    // Create game objects based on the reported score
    for (let i = 0; i < team1Wins; i++) {
      // Team 1 wins this game with a plausible score
      games.push({
        id: `game-${i + 1}`,
        matchId,
        gameNumber: i + 1,
        team1Score: 21,
        team2Score: Math.floor(Math.random() * 15) + 5, // Random score between 5-19
        winnerId: team1Id
      });
    }
    
    for (let i = 0; i < team2Wins; i++) {
      // Team 2 wins this game with a plausible score
      games.push({
        id: `game-${team1Wins + i + 1}`,
        matchId,
        gameNumber: team1Wins + i + 1,
        team1Score: Math.floor(Math.random() * 15) + 5, // Random score between 5-19
        team2Score: 21,
        winnerId: team2Id
      });
    }
    
    return games;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-center">
        Quick Score Entry
      </h2>
      
      <div className="flex items-center justify-center gap-3 text-base font-medium">
        <span>{team1Name}</span>
        <span className="text-gray-400">vs</span>
        <span>{team2Name}</span>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <p className="text-sm text-center text-muted-foreground">
        Select the final match score with one click:
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Team 1 Wins 2-0 */}
        <Button
          variant="outline"
          className={cn(
            "flex flex-col py-6 h-auto",
            "hover:bg-green-50 hover:text-green-700 hover:border-green-200",
            "dark:hover:bg-green-900/20 dark:hover:text-green-400 dark:hover:border-green-800"
          )}
          disabled={isSubmitting}
          onClick={() => handleQuickScore(2, 0)}
        >
          <span className="text-lg font-bold">2-0</span>
          <span className="text-xs">{team1Name} wins</span>
        </Button>
        
        {/* Team 1 Wins 2-1 */}
        <Button
          variant="outline"
          className={cn(
            "flex flex-col py-6 h-auto",
            "hover:bg-green-50 hover:text-green-700 hover:border-green-200",
            "dark:hover:bg-green-900/20 dark:hover:text-green-400 dark:hover:border-green-800"
          )}
          disabled={isSubmitting}
          onClick={() => handleQuickScore(2, 1)}
        >
          <span className="text-lg font-bold">2-1</span>
          <span className="text-xs">{team1Name} wins</span>
        </Button>
        
        {/* Team 2 Wins 2-1 */}
        <Button
          variant="outline"
          className={cn(
            "flex flex-col py-6 h-auto",
            "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200",
            "dark:hover:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-800"
          )}
          disabled={isSubmitting}
          onClick={() => handleQuickScore(1, 2)}
        >
          <span className="text-lg font-bold">1-2</span>
          <span className="text-xs">{team2Name} wins</span>
        </Button>
        
        {/* Team 2 Wins 2-0 */}
        <Button
          variant="outline"
          className={cn(
            "flex flex-col py-6 h-auto",
            "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200",
            "dark:hover:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-800"
          )}
          disabled={isSubmitting}
          onClick={() => handleQuickScore(0, 2)}
        >
          <span className="text-lg font-bold">0-2</span>
          <span className="text-xs">{team2Name} wins</span>
        </Button>
      </div>
      
      {isSubmitting && (
        <div className="flex justify-center pt-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      
      <div className="flex justify-center pt-2">
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default QuickScoreEditor;

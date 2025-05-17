
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Save, X } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PlayoffGame, MatchResult } from "@/services/brackets/types";
import { supabase } from "@/integrations/supabase/client";
import { PlayoffDatabaseAdapter } from "@/services/brackets/database/PlayoffDatabaseAdapter";
import GamesList from './GamesList';
import QuickScoreEditor from './QuickScoreEditor';

interface MatchScoreEditorProps {
  matchId: string;
  bracketId: string;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  bestOf: number;
  onClose: () => void;
  onSaveSuccess: () => void;
}

const MatchScoreEditor: React.FC<MatchScoreEditorProps> = ({
  matchId,
  bracketId,
  team1Id,
  team2Id, 
  team1Name,
  team2Name,
  bestOf = 3,
  onClose,
  onSaveSuccess
}) => {
  const { toast } = useToast();
  const [games, setGames] = useState<PlayoffGame[]>([
    { id: '1', matchId, gameNumber: 1, team1Score: 0, team2Score: 0, winnerId: null },
    { id: '2', matchId, gameNumber: 2, team1Score: 0, team2Score: 0, winnerId: null },
    { id: '3', matchId, gameNumber: 3, team1Score: 0, team2Score: 0, winnerId: null },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'quick' | 'detailed'>('quick');

  // Calculate match result based on games
  const calculateMatchResult = (selectedGames: PlayoffGame[]): MatchResult | null => {
    const completedGames = selectedGames.filter(
      game => game.team1Score > 0 || game.team2Score > 0
    );
    
    if (!completedGames.length) {
      return null;
    }
    
    const team1Wins = completedGames.filter(
      game => game.team1Score > game.team2Score
    ).length;
    
    const team2Wins = completedGames.filter(
      game => game.team2Score > game.team1Score
    ).length;
    
    // Determine match winner if either team has won enough games
    if (team1Wins > bestOf / 2) {
      return {
        matchId,
        winnerId: team1Id,
        loserId: team2Id,
        team1Score: team1Wins,
        team2Score: team2Wins,
        games: completedGames
      };
    } else if (team2Wins > bestOf / 2) {
      return {
        matchId,
        winnerId: team2Id,
        loserId: team1Id,
        team1Score: team1Wins,
        team2Score: team2Wins,
        games: completedGames
      };
    }
    
    return null;
  };

  const handleQuickScoreSubmit = async (team1GameWins: number, team2GameWins: number) => {
    setIsSubmitting(true);
    console.log(`Quick score submission: ${team1GameWins}-${team2GameWins}`);
    
    try {
      // Generate games array based on quick score
      const quickGames: PlayoffGame[] = [];
      
      // Add games for team1 wins
      for (let i = 0; i < team1GameWins; i++) {
        quickGames.push({
          id: `${i+1}`,
          matchId,
          gameNumber: i+1,
          team1Score: 21,
          team2Score: 11,
          winnerId: team1Id
        });
      }
      
      // Add games for team2 wins
      for (let i = 0; i < team2GameWins; i++) {
        quickGames.push({
          id: `${i+team1GameWins+1}`,
          matchId,
          gameNumber: i+team1GameWins+1,
          team1Score: 11,
          team2Score: 21,
          winnerId: team2Id
        });
      }
      
      // Calculate the match result
      const winnerId = team1GameWins > team2GameWins ? team1Id : team2Id;
      const loserId = team1GameWins > team2GameWins ? team2Id : team1Id;
      
      const matchResult: MatchResult = {
        matchId,
        winnerId,
        loserId,
        team1Score: team1GameWins,
        team2Score: team2GameWins,
        games: quickGames
      };
      
      // Submit the match result to the database
      await PlayoffDatabaseAdapter.submitMatchResult(matchResult);
      
      toast({
        title: "Score Submitted",
        description: `Match result: ${team1GameWins}-${team2GameWins}`,
      });
      
      onSaveSuccess();
      onClose();
      
    } catch (error) {
      console.error("Error submitting match score:", error);
      toast({
        title: "Error",
        description: "Failed to submit match score. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSaveDetailedScore = async () => {
    setIsSubmitting(true);
    
    try {
      const matchResult = calculateMatchResult(games);
      
      if (!matchResult) {
        toast({
          title: "Invalid Score",
          description: "Match must have a clear winner.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      // Submit the match result
      await PlayoffDatabaseAdapter.submitMatchResult(matchResult);
      
      toast({
        title: "Score Submitted",
        description: `Match result: ${matchResult.team1Score}-${matchResult.team2Score}`,
      });
      
      onSaveSuccess();
      onClose();
      
    } catch (error) {
      console.error("Error submitting detailed match score:", error);
      toast({
        title: "Error",
        description: "Failed to submit match score. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Match Score: {team1Name} vs {team2Name}</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {viewMode === 'quick' ? (
          <QuickScoreEditor 
            team1Name={team1Name} 
            team2Name={team2Name}
            onSubmitScore={handleQuickScoreSubmit}
            disabled={isSubmitting}
          />
        ) : (
          <GamesList 
            games={games} 
            setGames={setGames} 
            team1Name={team1Name} 
            team2Name={team2Name}
          />
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setViewMode(viewMode === 'quick' ? 'detailed' : 'quick')}
          disabled={isSubmitting}
        >
          {viewMode === 'quick' ? 'Game-by-Game Entry' : 'Quick Score Entry'}
        </Button>
        
        {viewMode === 'detailed' && (
          <Button 
            onClick={handleSaveDetailedScore} 
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default MatchScoreEditor;

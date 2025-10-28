
import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";
import { useMatchScoreState } from "./hooks/useMatchScoreState";
import { useGameManagement } from "./hooks/useGameManagement";
import { useMatchScoreValidation } from "./hooks/useMatchScoreValidation";
import { MatchScoreEditorProps } from "./types";
import MatchScoreHeader from "./components/MatchScoreHeader";
import ValidationErrorDisplay from "./components/ValidationErrorDisplay";
import GameScoresList from "./components/GameScoresList";
import MatchScoreActions from "./components/MatchScoreActions";

const MatchScoreEditor: React.FC<MatchScoreEditorProps> = ({
  match,
  teams,
  onSave,
  onCancel
}) => {
  const {
    isSubmitting,
    setIsSubmitting,
    validationError,
    setValidationError,
    games,
    setGames
  } = useMatchScoreState(match);
  
  const { validateGameScores, calculateTotalScore } = useMatchScoreValidation(
    games, 
    match.bestOf, 
    setValidationError
  );
  
  const { 
    handleGameScoreChange, 
    addGame, 
    removeGame, 
    canAddGames 
  } = useGameManagement({
    games, 
    setGames, 
    validateGameScores,
    maxGames: match.bestOf
  });

  const team1 = useMemo(() => teams.find(t => t.id === match.team1Id), [teams, match.team1Id]);
  const team2 = useMemo(() => teams.find(t => t.id === match.team2Id), [teams, match.team2Id]);
  
  // Detect BYE matches (one team is null)
  const isBye = !match.team1Id || !match.team2Id;
  const byeWinner = match.team1Id ? team1 : team2;
  
  const handleByeForfeit = async () => {
    try {
      setIsSubmitting(true);
      
      // Forfeit scores: winner gets bestOf, loser gets 0
      const forfeitGames = Array.from({ length: match.bestOf }, () => ({
        team1Score: match.team1Id ? 1 : 0,
        team2Score: match.team2Id ? 1 : 0
      }));
      
      const team1Wins = match.team1Id ? match.bestOf : 0;
      const team2Wins = match.team2Id ? match.bestOf : 0;
      const team1Score = match.team1Id ? 1 : 0;
      const team2Score = match.team2Id ? 1 : 0;
      
      const dummyRefetch = async () => {};
      
      await onSave(
        match.id,
        team1Score,
        team2Score,
        forfeitGames,
        team1Wins,
        team2Wins,
        dummyRefetch
      );
      onCancel();
    } catch (error) {
      console.error("Error saving BYE forfeit:", error);
      setValidationError("Failed to save BYE forfeit");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSave = async () => {
    if (!validateGameScores()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      const { team1Wins, team2Wins } = calculateTotalScore();
      
      // Calculate match scores (1-0 format for winner-loser)
      const team1Score = team1Wins > team2Wins ? 1 : 0;
      const team2Score = team2Wins > team1Wins ? 1 : 0;
      
      // Create a dummy refetchBrackets function since the actual refetch is handled at a higher level
      const dummyRefetch = async () => {};
      
      await onSave(
        match.id,
        team1Score,
        team2Score,
        games,
        team1Wins,
        team2Wins,
        dummyRefetch
      );
      onCancel();
    } catch (error) {
      console.error("Error saving match scores:", error);
      setValidationError("Failed to save match scores");
    } finally {
      setIsSubmitting(false);
    }
  };

  const { team1Wins, team2Wins } = calculateTotalScore();

  // BYE match rendering
  if (isBye && byeWinner) {
    return (
      <div className={cn("space-y-6", animations.fadeIn)}>
        <div className="text-center py-8 space-y-4">
          <div className="text-lg font-semibold text-muted-foreground">
            Match Forfeit - BYE
          </div>
          <div className="text-2xl font-bold">
            {byeWinner.name} wins by walkover
          </div>
          <div className="text-sm text-muted-foreground">
            (Best of {match.bestOf})
          </div>
        </div>
        
        <ValidationErrorDisplay error={validationError} />
        
        <div className="flex gap-2 justify-end pt-4 border-t">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleByeForfeit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : `Award Win (${match.bestOf}-0)`}
          </button>
        </div>
      </div>
    );
  }

  // Regular match rendering
  return (
    <div className={cn("space-y-6", animations.fadeIn)}>
      {/* Header with match info */}
      <MatchScoreHeader 
        team1={team1} 
        team2={team2} 
        matchType={match.matchType} 
        round={match.round} 
      />
      
      {/* Game scores section */}
      <div className={cn("border-t pt-4", animations.fadeIn)} style={{ animationDelay: '0.1s' }}>
        <div className="text-sm font-medium mb-2">Game Scores (Best of {match.bestOf})</div>
        
        <GameScoresList 
          games={games}
          team1={team1}
          team2={team2}
          onScoreChange={handleGameScoreChange}
          onRemoveGame={removeGame}
          canRemoveGame={games.length > 1}
        />
        
        <ValidationErrorDisplay error={validationError} />
        
        <div className={animations.fadeIn} style={{ animationDelay: '0.4s' }}>
          <MatchScoreActions
            onAddGame={addGame}
            onSave={handleSave}
            onCancel={onCancel}
            isSubmitting={isSubmitting}
            hasValidationError={!!validationError}
            canAddGames={canAddGames}
            team1Wins={team1Wins}
            team2Wins={team2Wins}
          />
        </div>
      </div>
    </div>
  );
};

export default MatchScoreEditor;

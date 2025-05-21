
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
  
  const handleSave = async () => {
    if (!validateGameScores()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      const { team1Wins, team2Wins } = calculateTotalScore();
      
      // Determine winner based on who has more game wins
      const winnerId = team1Wins > team2Wins ? match.team1Id : match.team2Id;
      
      if (!winnerId) {
        setValidationError("Unable to determine match winner");
        return;
      }
      
      await onSave(
        match.id,
        games,               // array of { team1Score, team2Score }
        team1Wins,
        team2Wins,
        winnerId
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

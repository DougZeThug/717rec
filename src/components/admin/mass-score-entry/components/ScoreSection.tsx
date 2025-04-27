
import React from "react";
import { MatchWithTeams } from "../types";
import ScoreButtonGroup from "./ScoreButtonGroup";
import { motion } from "framer-motion";
import ErrorAlert from "./ErrorAlert";

interface ScoreSectionProps {
  match: MatchWithTeams;
  isSubmitting?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onScoreChange: (scores: { team1Score: number; team2Score: number }) => void;
  onGameWinsChange: (gameWins: { team1GameWins: number; team2GameWins: number }) => void;
  onClearError?: () => void;
}

const ScoreSection: React.FC<ScoreSectionProps> = ({
  match,
  isSubmitting = false,
  hasError = false,
  errorMessage,
  onScoreChange,
  onGameWinsChange,
  onClearError
}) => {
  const handleScoreSelection = (scores: { 
    team1Score: number; 
    team2Score: number; 
    team1GameWins: number; 
    team2GameWins: number 
  }) => {
    // Update scores
    onScoreChange({
      team1Score: scores.team1Score,
      team2Score: scores.team2Score
    });
    
    // Update game wins
    onGameWinsChange({
      team1GameWins: scores.team1GameWins,
      team2GameWins: scores.team2GameWins
    });
  };

  return (
    <div className="space-y-4">
      {hasError && errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <ErrorAlert message={errorMessage} onClear={onClearError} />
        </motion.div>
      )}
      
      <div className="space-y-2">
        <div className="text-sm font-medium">Match Result</div>
        <ScoreButtonGroup
          value={{ 
            team1Score: match.team1Score || 0, 
            team2Score: match.team2Score || 0,
            team1GameWins: match.team1_game_wins || 0,
            team2GameWins: match.team2_game_wins || 0
          }}
          onChange={handleScoreSelection}
          disabled={isSubmitting}
          matchId={match.id}
          onComplete={() => {}}
        />
      </div>
    </div>
  );
};

export default ScoreSection;

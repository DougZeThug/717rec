
import React from "react";
import { MatchWithTeams } from "../types";
import ScoreInput from "./ScoreInput";
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {hasError && errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="col-span-2"
        >
          <ErrorAlert message={errorMessage} onClear={onClearError} />
        </motion.div>
      )}
      <div className="space-y-2">
        <div className="text-sm font-medium">Team 1 Score</div>
        <ScoreInput
          value={{ team1Score: match.team1Score || 0, team2Score: match.team2Score || 0 }}
          onChange={(scores) => onScoreChange(scores)}
          disabled={isSubmitting}
        />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">Team 2 Score</div>
        <ScoreInput
          value={{ team1Score: match.team1Score || 0, team2Score: match.team2Score || 0 }}
          onChange={(scores) => onScoreChange(scores)}
          disabled={isSubmitting}
        />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">Team 1 Game Wins</div>
        <ScoreButtonGroup
          value={{ 
            team1Score: match.team1_game_wins || 0, 
            team2Score: match.team2_game_wins || 0 
          }}
          onChange={(scores) => onGameWinsChange({ 
            team1GameWins: scores.team1Score, 
            team2GameWins: scores.team2Score 
          })}
          disabled={isSubmitting}
        />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">Team 2 Game Wins</div>
        <ScoreButtonGroup
          value={{ 
            team1Score: match.team1_game_wins || 0, 
            team2Score: match.team2_game_wins || 0 
          }}
          onChange={(scores) => onGameWinsChange({ 
            team1GameWins: scores.team1Score, 
            team2GameWins: scores.team2Score 
          })}
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
};

export default ScoreSection;

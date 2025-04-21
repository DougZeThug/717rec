
import React from "react";
import ScoreInput from "./ScoreInput";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ScoreSectionProps {
  value: {
    team1Score: number | null;
    team2Score: number | null;
  };
  onScoreChange: (scores: { team1Score: number; team2Score: number }) => void;
  onGameWinsChange: (gameWins: { team1GameWins: number; team2GameWins: number }) => void;
  onComplete: () => void;
  disabled: boolean;
  hasError: boolean;
  errorMessage?: string;
  onClearError?: (matchId: string) => void;
  matchId: string;
  isCompleted?: boolean;
}

const ScoreSection: React.FC<ScoreSectionProps> = ({
  value,
  onScoreChange,
  onGameWinsChange,
  onComplete,
  disabled,
  hasError,
  errorMessage,
  onClearError,
  matchId,
  isCompleted = false
}) => {
  return (
    <motion.div 
      className={cn(
        "flex flex-col items-center space-y-4 p-3 rounded-md transition-all duration-200",
        isCompleted ? "bg-muted/30" : "",
        disabled ? "opacity-90" : ""
      )}
      animate={{ 
        opacity: disabled ? 0.9 : 1,
        scale: disabled ? 0.98 : 1
      }}
      transition={{ duration: 0.2 }}
    >
      <ScoreInput
        value={value}
        onChange={onScoreChange}
        onChangeGameWins={onGameWinsChange}
        onComplete={onComplete}
        disabled={disabled}
        isCompleted={isCompleted}
      />
      
      {hasError && (
        <div className="text-xs text-destructive flex items-center gap-2">
          <span>{errorMessage || "Invalid score"}</span>
          {onClearError && (
            <button
              onClick={() => onClearError(matchId)}
              className="underline"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ScoreSection;

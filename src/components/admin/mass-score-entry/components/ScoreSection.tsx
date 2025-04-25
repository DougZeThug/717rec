
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
  matchDate?: string; // Optional match date for debugging
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
  isCompleted = false,
  matchDate
}) => {
  // Log component initialization
  React.useEffect(() => {
    console.log(`%c ScoreSection for match ${matchId} initialized:`, "background: #fff3e0; color: #e65100; font-weight: bold", {
      matchId,
      matchDate,
      initialValue: value,
      isCompleted,
      hasError,
      errorMessage,
      disabled
    });
  }, []);

  // Log on render
  console.log(`%c ScoreSection rendering:`, "color: #e65100", {
    matchId,
    matchDate,
    currentValue: value,
    hasError,
    isCompleted,
    disabled
  });

  // Extract date part only if available
  const dateOnly = matchDate ? matchDate.split('T')[0] : "unknown";

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
      data-match-id={matchId}
      data-match-date={dateOnly}
    >
      <ScoreInput
        value={value}
        onChange={(newScores) => {
          console.log(`%c ScoreSection onScoreChange called:`, "background: #ffe0b2; color: #e65100", {
            matchId,
            matchDate: dateOnly,
            previousValue: value,
            newScores
          });
          onScoreChange(newScores);
        }}
        onChangeGameWins={(gameWins) => {
          console.log(`%c ScoreSection onGameWinsChange called:`, "background: #ffcc80; color: #e65100", {
            matchId,
            matchDate: dateOnly,
            gameWins
          });
          onGameWinsChange(gameWins);
        }}
        onComplete={() => {
          console.log(`%c ScoreSection onComplete called:`, "background: #ffb74d; color: #e65100", {
            matchId,
            matchDate: dateOnly
          });
          onComplete();
        }}
        disabled={disabled}
        isCompleted={isCompleted}
        matchId={matchId}
        matchDate={dateOnly}
      />
      
      {hasError && (
        <div className="text-xs text-destructive flex items-center gap-2">
          <span>{errorMessage || "Invalid score"}</span>
          {onClearError && (
            <button
              onClick={() => {
                console.log(`%c Clearing error for match:`, "background: #ff9800; color: white", {
                  matchId,
                  matchDate: dateOnly,
                  errorMessage
                });
                onClearError(matchId);
              }}
              className="underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Add debug indicator for date */}
      <div className="text-[10px] text-gray-400">
        Match ID: {matchId.substring(0, 8)}... | Date: {dateOnly || "unknown"}
      </div>
    </motion.div>
  );
};

export default ScoreSection;

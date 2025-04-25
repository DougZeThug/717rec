
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
    console.log(`🔍 DIAGNOSTIC: ScoreSection for match ${matchId} initialized:`, {
      matchId,
      matchDate,
      dateType: typeof matchDate,
      dateObj: matchDate ? new Date(matchDate).toISOString() : null,
      initialValue: value,
      valueTypes: {
        team1ScoreType: typeof value.team1Score,
        team2ScoreType: typeof value.team2Score
      },
      isCompleted,
      hasError,
      errorMessage,
      disabled
    });
  }, [matchId]);

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
          console.log(`🔍 DIAGNOSTIC: ScoreSection onScoreChange called:`, {
            matchId,
            matchDate: dateOnly,
            dateType: typeof matchDate,
            previousValue: value,
            newScores,
            scoreTypes: {
              team1ScoreType: typeof newScores.team1Score,
              team2ScoreType: typeof newScores.team2Score
            }
          });
          onScoreChange(newScores);
        }}
        onChangeGameWins={(gameWins) => {
          console.log(`🔍 DIAGNOSTIC: ScoreSection onGameWinsChange called:`, {
            matchId,
            matchDate: dateOnly,
            dateType: typeof matchDate,
            gameWins,
            gameWinsTypes: {
              team1GameWinsType: typeof gameWins.team1GameWins,
              team2GameWinsType: typeof gameWins.team2GameWins
            }
          });
          onGameWinsChange(gameWins);
        }}
        onComplete={() => {
          console.log(`🔍 DIAGNOSTIC: ScoreSection onComplete called:`, {
            matchId,
            matchDate: dateOnly,
            dateType: typeof matchDate,
            value
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
                console.log(`🔍 DIAGNOSTIC: Clearing error for match:`, {
                  matchId,
                  matchDate: dateOnly,
                  dateType: typeof matchDate,
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
        Match ID: {matchId.substring(0, 8)}... | Date: {dateOnly || "unknown"} | Type: {typeof matchDate}
      </div>
    </motion.div>
  );
};

export default ScoreSection;

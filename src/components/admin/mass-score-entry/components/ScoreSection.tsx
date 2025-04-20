
import React from "react";
import ScoreInput from "./ScoreInput";

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
  matchId
}) => {
  return (
    <div className="flex flex-col items-center space-y-4">
      <ScoreInput
        value={value}
        onChange={onScoreChange}
        onChangeGameWins={onGameWinsChange}
        onComplete={onComplete}
        disabled={disabled}
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
    </div>
  );
};

export default ScoreSection;

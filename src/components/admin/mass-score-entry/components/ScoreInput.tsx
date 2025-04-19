
import React from "react";
import ScoreButtonGroup from "./ScoreButtonGroup";

interface ScoreInputProps {
  value: { team1Score: number | null; team2Score: number | null };
  onChange: (scores: { team1Score: number; team2Score: number }) => void;
  onChangeGameWins?: (gameWins: { team1GameWins: number; team2GameWins: number }) => void;
  onComplete?: () => void;
  isValid?: boolean;
  disabled?: boolean;
  className?: string;
}

const ScoreInput: React.FC<ScoreInputProps> = ({
  value,
  onChange,
  onChangeGameWins,
  onComplete,
  isValid = true,
  disabled = false,
  className = ""
}) => {
  return (
    <div className={`flex justify-center ${className}`}>
      <ScoreButtonGroup
        value={value}
        onChange={(scores) => {
          onChange(scores);
          
          // Also update game wins when score changes
          if (onChangeGameWins) {
            onChangeGameWins({
              team1GameWins: scores.team1Score,
              team2GameWins: scores.team2Score
            });
          }
        }}
        onComplete={onComplete}
        disabled={disabled}
      />
    </div>
  );
};

export default ScoreInput;

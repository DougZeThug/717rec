
import React from "react";
import ScoreButtonGroup from "./ScoreButtonGroup";

interface ScoreInputProps {
  value: { team1Score: number | null; team2Score: number | null };
  onChange: (scores: { team1Score: number; team2Score: number }) => void;
  onComplete?: () => void;
  isValid?: boolean;
  disabled?: boolean;
  className?: string;
}

const ScoreInput: React.FC<ScoreInputProps> = ({
  value,
  onChange,
  onComplete,
  isValid = true,
  disabled = false,
  className = ""
}) => {
  return (
    <div className={`flex justify-center ${className}`}>
      <ScoreButtonGroup
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        disabled={disabled}
      />
    </div>
  );
};

export default ScoreInput;

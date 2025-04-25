
import React from "react";
import ScoreButton from "./ScoreButton";
import { SCORE_OPTIONS } from "./types";

interface ScoreButtonGroupProps {
  value: { team1Score: number | null; team2Score: number | null } | null;
  onChange: (scores: { team1Score: number; team2Score: number }) => void;
  disabled?: boolean;
  onComplete?: () => void;
  isCompleted?: boolean;
}

const ScoreButtonGroup: React.FC<ScoreButtonGroupProps> = ({
  value,
  onChange,
  disabled = false,
  onComplete,
  isCompleted = false
}) => {
  const isSelected = (option: typeof SCORE_OPTIONS[number]) =>
    value?.team1Score === option.team1Score && 
    value?.team2Score === option.team2Score;

  const handleSelect = (option: typeof SCORE_OPTIONS[number]) => {
    onChange({
      team1Score: option.team1Score,
      team2Score: option.team2Score
    });
    
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex text-xs text-gray-500 justify-between px-4">
        <span>Team 1</span>
        <span>Team 2</span>
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {SCORE_OPTIONS.map((option) => (
          <ScoreButton
            key={option.label}
            option={option}
            isSelected={isSelected(option)}
            onClick={() => handleSelect(option)}
            disabled={disabled}
            isCompleted={isCompleted}
          />
        ))}
      </div>
      <div className="text-xs text-center text-gray-500">
        (First number represents Team 1's game wins)
      </div>
    </div>
  );
};

export default ScoreButtonGroup;

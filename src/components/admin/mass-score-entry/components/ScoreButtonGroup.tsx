
import React, { useEffect, useState } from "react";
import ScoreButton from "./ScoreButton";
import { SCORE_OPTIONS } from "./types";

interface ScoreButtonGroupProps {
  value: { team1Score: number; team2Score: number } | null;
  onChange: (scores: { team1Score: number; team2Score: number }) => void;
  disabled?: boolean;
  onComplete?: () => void;
  matchId?: string;
}

const ScoreButtonGroup: React.FC<ScoreButtonGroupProps> = ({
  value,
  onChange,
  disabled = false,
  onComplete,
  matchId = "unknown"
}) => {
  const [selectedOption, setSelectedOption] = useState<{
    team1Score: number;
    team2Score: number;
  } | null>(null);
  
  // Initialize selection from props
  useEffect(() => {
    if (value && value.team1Score !== null && value.team2Score !== null) {
      setSelectedOption({
        team1Score: Number(value.team1Score),
        team2Score: Number(value.team2Score)
      });
    } else {
      setSelectedOption(null);
    }
  }, [value?.team1Score, value?.team2Score]);

  // Strict numeric comparison for selection state
  const isSelected = (option: typeof SCORE_OPTIONS[number]) => {
    if (!selectedOption) return false;
    return (
      Number(selectedOption.team1Score) === Number(option.team1Score) && 
      Number(selectedOption.team2Score) === Number(option.team2Score)
    );
  };

  const handleSelect = (option: typeof SCORE_OPTIONS[number]) => {
    const newSelection = {
      team1Score: Number(option.team1Score),
      team2Score: Number(option.team2Score)
    };
    
    setSelectedOption(newSelection);
    onChange(newSelection);
    
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap justify-center">
        {SCORE_OPTIONS.map((option) => (
          <ScoreButton
            key={`${matchId}-${option.label}`}
            option={option}
            isSelected={isSelected(option)}
            onClick={() => handleSelect(option)}
            disabled={disabled}
            matchId={matchId}
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

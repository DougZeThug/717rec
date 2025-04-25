
import React, { useEffect } from "react";
import ScoreButton from "./ScoreButton";
import { SCORE_OPTIONS } from "./types";

interface ScoreButtonGroupProps {
  value: { team1Score: number | null; team2Score: number | null } | null;
  onChange: (scores: { team1Score: number; team2Score: number }) => void;
  disabled?: boolean;
  onComplete?: () => void;
  isCompleted?: boolean;
  matchId?: string; // Optional match ID for debugging
}

const ScoreButtonGroup: React.FC<ScoreButtonGroupProps> = ({
  value,
  onChange,
  disabled = false,
  onComplete,
  isCompleted = false,
  matchId
}) => {
  // Log the initial value when component mounts or value changes
  useEffect(() => {
    console.log(`ScoreButtonGroup for match ${matchId || 'unknown'} initialized with value:`, value);
  }, [matchId, value]);

  // Strict equality check for scores to handle 0 values correctly
  const isSelected = (option: typeof SCORE_OPTIONS[number]) => {
    if (!value) return false;
    const team1Score = value.team1Score === null ? null : Number(value.team1Score);
    const team2Score = value.team2Score === null ? null : Number(value.team2Score);
    
    console.log("Checking selection:", {
      matchId,
      buttonScores: `${option.team1Score}-${option.team2Score}`,
      currentValue: `${team1Score}-${team2Score}`,
      isMatch: team1Score === option.team1Score && team2Score === option.team2Score
    });
    
    return team1Score === option.team1Score && team2Score === option.team2Score;
  };

  const handleSelect = (option: typeof SCORE_OPTIONS[number]) => {
    console.log(`ScoreButtonGroup: selected option ${option.label} (${option.team1Score}-${option.team2Score}) for match ${matchId || 'unknown'}`);
    
    // Always pass numbers to prevent type issues
    onChange({
      team1Score: Number(option.team1Score),
      team2Score: Number(option.team2Score)
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
            key={`${option.team1Score}-${option.team2Score}`}
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

import React, { useEffect } from "react";
import ScoreButton from "./ScoreButton";
import { SCORE_OPTIONS } from "./types";

interface ScoreButtonGroupProps {
  value: { team1Score: number | null; team2Score: number | null } | null;
  onChange: (scores: { team1Score: number; team2Score: number }) => void;
  disabled?: boolean;
  onComplete?: () => void;
  isCompleted?: boolean;
  matchId?: string;
  matchDate?: string;
}

const ScoreButtonGroup: React.FC<ScoreButtonGroupProps> = ({
  value,
  onChange,
  disabled = false,
  onComplete,
  isCompleted = false,
  matchId = "unknown",
  matchDate
}) => {
  // Log on initial render and value changes
  useEffect(() => {
    console.log(`ScoreButtonGroup initialized for match ${matchId}:`, {
      matchId,
      matchDate,
      dateType: typeof matchDate,
      initialValue: value,
      valueType: typeof value,
      team1Score: value?.team1Score,
      team1ScoreType: typeof value?.team1Score,
      team2Score: value?.team2Score,
      team2ScoreType: typeof value?.team2Score
    });
  }, [matchId, matchDate, value]);

  // Strict numeric comparison for selection state
  const isSelected = (option: typeof SCORE_OPTIONS[number]) => {
    if (!value) {
      console.log(`Selection check failed: value is null/undefined for match ${matchId}`);
      return false;
    }
    
    // Convert scores to numbers and handle null/undefined
    const team1Score = value.team1Score === null || value.team1Score === undefined 
      ? null 
      : Number(value.team1Score);
    const team2Score = value.team2Score === null || value.team2Score === undefined 
      ? null 
      : Number(value.team2Score);
    
    // Detailed logging for selection checking
    const isMatch = team1Score === Number(option.team1Score) && team2Score === Number(option.team2Score);
    
    console.log(`Selection check for ${matchId}:`, {
      buttonScores: `${option.team1Score}-${option.team2Score}`,
      currentValue: `${team1Score}-${team2Score}`,
      team1Score,
      team2Score,
      optionTeam1Score: Number(option.team1Score),
      optionTeam2Score: Number(option.team2Score),
      isMatch
    });
    
    return isMatch;
  };

  const handleSelect = (option: typeof SCORE_OPTIONS[number]) => {
    console.log(`ScoreButtonGroup: selected option for match ${matchId}:`, {
      matchId,
      matchDate,
      dateType: typeof matchDate,
      label: option.label,
      scores: `${option.team1Score}-${option.team2Score}`,
      previousValue: value
    });
    
    // Always pass numbers
    const newScores = {
      team1Score: Number(option.team1Score),
      team2Score: Number(option.team2Score)
    };
    
    onChange(newScores);
    
    if (onComplete) {
      console.log(`Calling onComplete for match ${matchId}`);
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
            key={`${matchId}-${option.team1Score}-${option.team2Score}`}
            option={option}
            isSelected={isSelected(option)}
            onClick={() => handleSelect(option)}
            disabled={disabled}
            isCompleted={isCompleted}
            matchId={matchId}
            matchDate={matchDate}
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


import React, { useEffect, useState } from "react";
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
  // Internal state to track selection
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
    
    console.log(`ScoreButtonGroup initialized for match ${matchId}:`, {
      matchId,
      matchDate,
      dateType: typeof matchDate,
      initialValue: value,
      valueType: typeof value,
      team1Score: value?.team1Score,
      team1ScoreType: typeof value?.team1Score,
      team2Score: value?.team2Score,
      team2ScoreType: typeof value?.team2Score,
      internalState: selectedOption
    });
  }, [matchId, matchDate]);
  
  // Update internal state when props change
  useEffect(() => {
    if (value && value.team1Score !== null && value.team2Score !== null) {
      console.log(`ScoreButtonGroup value prop changed for match ${matchId}:`, {
        newValue: value,
        team1Score: Number(value.team1Score),
        team2Score: Number(value.team2Score),
        previousState: selectedOption
      });
      
      setSelectedOption({
        team1Score: Number(value.team1Score),
        team2Score: Number(value.team2Score)
      });
    }
  }, [value?.team1Score, value?.team2Score, matchId]);

  // Strict numeric comparison for selection state
  const isSelected = (option: typeof SCORE_OPTIONS[number]) => {
    if (!selectedOption) {
      return false;
    }
    
    // Convert to numbers for strict comparison
    const isMatch = 
      Number(selectedOption.team1Score) === Number(option.team1Score) && 
      Number(selectedOption.team2Score) === Number(option.team2Score);
    
    console.log(`Selection check for ${matchId}:`, {
      buttonScores: `${option.team1Score}-${option.team2Score}`,
      currentValue: selectedOption ? `${selectedOption.team1Score}-${selectedOption.team2Score}` : 'null',
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
      label: option.label,
      scores: `${option.team1Score}-${option.team2Score}`,
      previousValue: selectedOption
    });
    
    // Update internal state first
    const newSelection = {
      team1Score: Number(option.team1Score),
      team2Score: Number(option.team2Score)
    };
    setSelectedOption(newSelection);
    
    // Then call the onChange prop
    onChange(newSelection);
    
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

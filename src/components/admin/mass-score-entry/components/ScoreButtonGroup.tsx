
import React, { useEffect, useState } from "react";
import ScoreButton from "./ScoreButton";
import { SCORE_OPTIONS } from "./types";

interface ScoreButtonGroupProps {
  value: { team1Score: number; team2Score: number; team1GameWins?: number; team2GameWins?: number } | null;
  onChange: (scores: { team1Score: number; team2Score: number; team1GameWins: number; team2GameWins: number }) => void;
  disabled?: boolean;
  onComplete?: () => void;
  matchId?: string;
  isCompleted?: boolean;
  matchDate?: string;
}

const ScoreButtonGroup: React.FC<ScoreButtonGroupProps> = ({
  value,
  onChange,
  disabled = false,
  onComplete,
  matchId = "unknown",
  isCompleted = false,
  matchDate
}) => {
  const [selectedOption, setSelectedOption] = useState<{
    team1Score: number;
    team2Score: number;
    team1GameWins: number;
    team2GameWins: number;
  } | null>(null);
  
  // Initialize selection from props
  useEffect(() => {
    if (value && value.team1Score !== null && value.team2Score !== null) {
      setSelectedOption({
        team1Score: Number(value.team1Score),
        team2Score: Number(value.team2Score),
        team1GameWins: Number(value.team1GameWins || 0),
        team2GameWins: Number(value.team2GameWins || 0)
      });
    } else {
      setSelectedOption(null);
    }
  }, [value?.team1Score, value?.team2Score, value?.team1GameWins, value?.team2GameWins]);

  // Strict numeric comparison for selection state
  const isSelected = (option: typeof SCORE_OPTIONS[number]) => {
    if (!selectedOption) return false;
    
    // Check both scores and game wins to determine if this option is selected
    return (
      Number(selectedOption.team1Score) === Number(option.team1Score) && 
      Number(selectedOption.team2Score) === Number(option.team2Score) &&
      Number(selectedOption.team1GameWins) === Number(option.team1GameWins) &&
      Number(selectedOption.team2GameWins) === Number(option.team2GameWins)
    );
  };

  const handleSelect = (option: typeof SCORE_OPTIONS[number]) => {
    const newSelection = {
      team1Score: Number(option.team1Score),
      team2Score: Number(option.team2Score),
      team1GameWins: Number(option.team1GameWins),
      team2GameWins: Number(option.team2GameWins)
    };
    
    console.log(`ScoreButtonGroup: Option selected for match ${matchId}:`, {
      option: option.label,
      scores: `${option.team1Score}-${option.team2Score}`,
      gameWins: `${option.team1GameWins}-${option.team2GameWins}`
    });
    
    setSelectedOption(newSelection);
    onChange(newSelection);
    
    // Auto-complete when a score is selected
    if (onComplete) {
      console.log(`ScoreButtonGroup: Auto-completing match ${matchId} after score selection`);
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

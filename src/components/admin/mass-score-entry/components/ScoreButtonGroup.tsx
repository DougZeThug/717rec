
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
  matchDate?: string; // Optional match date for debugging
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
  // Log the initial value when component mounts or value changes
  useEffect(() => {
    console.log(`%c ScoreButtonGroup initialized`, "background: #004d40; color: white", {
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

  // Log on every render
  console.log(`%c ScoreButtonGroup rendering`, "background: #e0f2f1; color: #004d40", {
    matchId,
    matchDate,
    dateType: typeof matchDate,
    currentValue: value,
    valueContents: JSON.stringify(value),
    isCompleted
  });

  // Strict equality check for scores to handle 0 values correctly
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
    
    console.log(`%c Selection check for ${matchId?.substring(0, 8) || 'unknown'}`, "color: #004d40", {
      buttonScores: `${option.team1Score}-${option.team2Score}`,
      currentValue: `${team1Score}-${team2Score}`,
      team1Score,
      team2Score,
      optionTeam1Score: option.team1Score,
      optionTeam2Score: option.team2Score,
      isMatch,
      matchDate,
      dateType: typeof matchDate,
      option
    });
    
    return isMatch;
  };

  const handleSelect = (option: typeof SCORE_OPTIONS[number]) => {
    console.log(`%c ScoreButtonGroup: selected option`, "background: #b2dfdb; color: #004d40; font-weight: bold", {
      matchId,
      matchDate,
      dateType: typeof matchDate,
      label: option.label,
      scores: `${option.team1Score}-${option.team2Score}`,
      previousValue: value,
      valueJSON: JSON.stringify(value)
    });
    
    // Always pass numbers to prevent type issues
    const newScores = {
      team1Score: Number(option.team1Score),
      team2Score: Number(option.team2Score)
    };
    
    onChange(newScores);
    
    // Log after state update (won't show updated state due to async nature)
    console.log(`%c After onChange call:`, "background: #80cbc4; color: #004d40", {
      matchId,
      matchDate,
      dateType: typeof matchDate,
      newScores,
      newScoresJSON: JSON.stringify(newScores)
    });
    
    if (onComplete) {
      console.log(`%c Calling onComplete for match`, "background: #4db6ac; color: white", {
        matchId,
        matchDate,
        dateType: typeof matchDate
      });
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

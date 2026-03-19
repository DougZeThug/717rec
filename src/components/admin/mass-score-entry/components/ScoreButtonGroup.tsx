import React, { useEffect, useState } from 'react';

import { scoreLog } from '@/utils/logger';

import ScoreButton from './ScoreButton';
import { SCORE_OPTIONS } from './types';

interface ScoreButtonGroupProps {
  value: {
    team1Score: number;
    team2Score: number;
    team1GameWins?: number;
    team2GameWins?: number;
  } | null;
  onChange: (scores: {
    team1Score: number;
    team2Score: number;
    team1GameWins: number;
    team2GameWins: number;
  }) => void;
  disabled?: boolean;
  onComplete?: () => void;
  matchId?: string;
  isCompleted?: boolean;
  matchDate?: string;
  team1Name?: string;
  team2Name?: string;
}

const ScoreButtonGroup: React.FC<ScoreButtonGroupProps> = ({
  value,
  onChange,
  disabled = false,
  onComplete,
  matchId = 'unknown',
  isCompleted: _isCompleted = false,
  matchDate,
  team1Name = 'Team 1',
  team2Name = 'Team 2',
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
        team2GameWins: Number(value.team2GameWins || 0),
      });
    } else {
      setSelectedOption(null);
    }
  }, [value?.team1Score, value?.team2Score, value?.team1GameWins, value?.team2GameWins]);

  // Strict numeric comparison for selection state
  const isSelected = (option: (typeof SCORE_OPTIONS)[number]) => {
    if (!selectedOption) return false;

    // Check both scores and game wins to determine if this option is selected
    return (
      Number(selectedOption.team1Score) === Number(option.team1Score) &&
      Number(selectedOption.team2Score) === Number(option.team2Score) &&
      Number(selectedOption.team1GameWins) === Number(option.team1GameWins) &&
      Number(selectedOption.team2GameWins) === Number(option.team2GameWins)
    );
  };

  const handleSelect = (option: (typeof SCORE_OPTIONS)[number]) => {
    const newSelection = {
      team1Score: Number(option.team1Score),
      team2Score: Number(option.team2Score),
      team1GameWins: Number(option.team1GameWins),
      team2GameWins: Number(option.team2GameWins),
    };

    scoreLog(`ScoreButtonGroup: Option selected for match ${matchId}:`, {
      option: option.label,
      scores: `${option.team1Score}-${option.team2Score}`,
      gameWins: `${option.team1GameWins}-${option.team2GameWins}`,
    });

    setSelectedOption(newSelection);
    onChange(newSelection);

    // Auto-complete when a score is selected
    if (onComplete) {
      scoreLog(`ScoreButtonGroup: Auto-completing match ${matchId} after score selection`);
      onComplete();
    }
  };

  // Abbreviate team name to first ~10 chars
  const abbreviate = (name: string) => (name.length > 12 ? name.slice(0, 10) + '…' : name);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center px-1 text-[10px] font-medium text-muted-foreground">
        <span className="truncate max-w-[40%]">← {abbreviate(team1Name)}</span>
        <span className="truncate max-w-[40%] text-right">{abbreviate(team2Name)} →</span>
      </div>
      <div className="flex gap-1.5 sm:gap-3 flex-wrap justify-center w-full">
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
    </div>
  );
};

export default ScoreButtonGroup;

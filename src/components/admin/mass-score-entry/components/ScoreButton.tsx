import { motion } from 'framer-motion';
import React from 'react';

import { cn } from '@/lib/utils';
import { scoreLog } from '@/utils/logger';

import { ScoreOption } from './types';

interface ScoreButtonProps {
  option: ScoreOption;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  isCompleted?: boolean;
  matchId?: string; // Added for debugging
  matchDate?: string; // Added for debugging
}

const ScoreButton = ({
  option,
  isSelected,
  onClick,
  disabled = false,
  isCompleted = false,
  matchId = 'unknown', // Default value for debugging
  matchDate = 'unknown', // Default value for debugging
}: ScoreButtonProps) => {
  // Handle click event with detailed logging
  const handleClick = () => {
    if (!disabled) {
      scoreLog('ScoreButton clicked:', {
        matchId,
        matchDate,
        dateType: typeof matchDate,
        scores: `${option.team1Score}-${option.team2Score}`,
        gameWins: `${option.team1GameWins}-${option.team2GameWins}`,
        isSelected: Boolean(isSelected),
        wasSelected: isSelected,
        isCompleted,
        label: option.label,
        timeOfClick: new Date().toISOString(),
      });
      onClick();

      // Log state after a small delay to see if it updated correctly
      setTimeout(() => {
        scoreLog('ScoreButton after click:', {
          matchId,
          matchDate,
          dateType: typeof matchDate,
          scores: `${option.team1Score}-${option.team2Score}`,
          gameWins: `${option.team1GameWins}-${option.team2GameWins}`,
          isSelected: Boolean(isSelected), // This won't reflect changes yet due to React re-render cycle
          label: option.label,
        });
      }, 100);
    }
  };

  // Force boolean type for isSelected to prevent truthy/falsey issues
  // This is critical for correctly rendering selected state with 0 values
  const selected = Boolean(isSelected);

  scoreLog(
    `ScoreButton render [${matchId?.substring(0, 8) || 'unknown'}] [${matchDate || 'unknown'}] - option: ${option.label} isSelected:`,
    selected
  );

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'rounded-md min-w-[3.5rem] h-10 px-3 border transition-colors duration-200',
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : isCompleted
            ? 'bg-muted hover:bg-muted/80 border-muted-foreground/20'
            : 'bg-background hover:bg-muted border-input',
        isCompleted && !selected && 'opacity-60',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      data-testid={`score-button-${option.label}`}
      data-selected={selected}
      data-score1={option.team1Score}
      data-score2={option.team2Score}
      data-game-wins1={option.team1GameWins}
      data-game-wins2={option.team2GameWins}
      data-match-id={matchId}
      data-match-date={matchDate}
      data-date-type={typeof matchDate}
      aria-pressed={selected}
    >
      {option.label}
    </motion.button>
  );
};

export default ScoreButton;

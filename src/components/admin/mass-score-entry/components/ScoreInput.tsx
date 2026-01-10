import { motion } from 'framer-motion';
import React from 'react';

import { cn } from '@/lib/utils';
import { scoreLog } from '@/utils/logger';

import ScoreButtonGroup from './ScoreButtonGroup';

interface ScoreInputProps {
  value: {
    team1Score: number | null;
    team2Score: number | null;
    team1GameWins?: number | null;
    team2GameWins?: number | null;
  };
  onChange: (scores: { team1Score: number; team2Score: number }) => void;
  onChangeGameWins?: (gameWins: { team1GameWins: number; team2GameWins: number }) => void;
  onComplete: () => void;
  disabled: boolean;
  className?: string;
  isCompleted?: boolean;
  matchId: string;
  matchDate?: string;
}

const ScoreInput: React.FC<ScoreInputProps> = ({
  value,
  onChange,
  onChangeGameWins,
  onComplete,
  disabled,
  className = '',
  isCompleted = false,
  matchId,
  matchDate,
}) => {
  return (
    <motion.div
      className={cn('w-full flex justify-center', className)}
      animate={{ opacity: disabled ? 0.8 : 1 }}
      transition={{ duration: 0.2 }}
    >
      <ScoreButtonGroup
        value={value}
        onChange={(scores) => {
          // Ensure numeric scores
          const numericScores = {
            team1Score: Number(scores.team1Score),
            team2Score: Number(scores.team2Score),
          };

          scoreLog(`ScoreInput onChange called for match ${matchId}:`, {
            matchId,
            matchDate,
            dateType: typeof matchDate,
            scores: numericScores,
            previousValue: value,
          });

          onChange(numericScores);

          // If we have a game wins handler, pass numeric values
          if (onChangeGameWins) {
            const numericGameWins = {
              team1GameWins: Number(scores.team1GameWins),
              team2GameWins: Number(scores.team2GameWins),
            };

            scoreLog(`ScoreInput onChangeGameWins called for match ${matchId}:`, {
              matchId,
              matchDate,
              numericGameWins,
            });

            onChangeGameWins(numericGameWins);
          }
        }}
        onComplete={onComplete}
        disabled={disabled}
        isCompleted={isCompleted}
        matchId={matchId}
        matchDate={matchDate}
      />
    </motion.div>
  );
};

export default ScoreInput;

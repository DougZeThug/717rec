import React from 'react';

import { cn } from '@/lib/utils';

interface MatchCardScoreProps {
  team1Score: number;
  team2Score: number;
  team1IsWinner: boolean;
  team2IsWinner: boolean;
  isAnimating: boolean;
}

const scoreStyle = (isWinner: boolean, isAnimating: boolean) =>
  cn(
    'text-2xl font-black tracking-wide tabular-nums transition-all duration-500',
    isAnimating && 'animate-scale-in',
    isWinner ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
  );

/** The number pill between the two teams. Games won once the match is final. */
export const MatchCardScore: React.FC<MatchCardScoreProps> = ({
  team1Score,
  team2Score,
  team1IsWinner,
  team2IsWinner,
  isAnimating,
}) => (
  <div className="flex flex-col items-center">
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-1.5 rounded-full',
        'bg-muted/80 dark:bg-muted/40',
        'shadow-sm'
      )}
    >
      <span className={scoreStyle(team1IsWinner, isAnimating)}>{team1Score}</span>
      <span className="text-lg font-bold text-muted-foreground/60">–</span>
      <span className={scoreStyle(team2IsWinner, isAnimating)}>{team2Score}</span>
    </div>
  </div>
);

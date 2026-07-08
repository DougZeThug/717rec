import React from 'react';

import { cn } from '@/lib/utils';
import type { TeamSide } from '@/utils/liveScoring/types';

interface GameScoreboardProps {
  gameNumber: number;
  team1Name: string;
  team2Name: string;
  totals: { team1: number; team2: number };
  leaderSide: TeamSide | null;
  rulesLabel: string;
}

const scoreClass = (isLeading: boolean) =>
  cn(
    'font-display text-5xl font-bold tabular-nums transition-colors',
    isLeading ? 'text-primary' : 'text-foreground'
  );

export const GameScoreboard: React.FC<GameScoreboardProps> = ({
  gameNumber,
  team1Name,
  team2Name,
  totals,
  leaderSide,
  rulesLabel,
}) => (
  <div className="rounded-lg border bg-card p-4 text-center">
    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      Game {gameNumber} · {rulesLabel}
    </div>
    <div className="flex items-center justify-center gap-6">
      <div className="flex-1 text-right">
        <div className={scoreClass(leaderSide === 1)} data-testid="team1-total">
          {totals.team1}
        </div>
        <div className="truncate text-xs text-muted-foreground">{team1Name}</div>
      </div>
      <span className="text-2xl text-muted-foreground">:</span>
      <div className="flex-1 text-left">
        <div className={scoreClass(leaderSide === 2)} data-testid="team2-total">
          {totals.team2}
        </div>
        <div className="truncate text-xs text-muted-foreground">{team2Name}</div>
      </div>
    </div>
  </div>
);

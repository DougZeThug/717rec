import NumberFlow from '@number-flow/react';
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

/**
 * A total whose digits roll when it changes. NumberFlow's digits are not real
 * text: a screen reader would read 24 as "2 4" and the text could not be
 * copied. So the animated digits are hidden from assistive tech and a plain
 * visually-hidden copy carries the real number.
 */
const ScoreTotal: React.FC<{ value: number; isLeading: boolean; testId: string }> = ({
  value,
  isLeading,
  testId,
}) => (
  <div className={scoreClass(isLeading)} data-testid={testId}>
    <NumberFlow value={value} aria-hidden="true" />
    <span className="sr-only">{value}</span>
  </div>
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
        <ScoreTotal value={totals.team1} isLeading={leaderSide === 1} testId="team1-total" />
        <div className="truncate text-xs text-muted-foreground">{team1Name}</div>
      </div>
      <span className="text-2xl text-muted-foreground">:</span>
      <div className="flex-1 text-left">
        <ScoreTotal value={totals.team2} isLeading={leaderSide === 2} testId="team2-total" />
        <div className="truncate text-xs text-muted-foreground">{team2Name}</div>
      </div>
    </div>
  </div>
);

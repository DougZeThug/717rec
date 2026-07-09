import React from 'react';

import { cn } from '@/lib/utils';
import { getAmbiguousOptions, isAmbiguousScore } from '@/utils/liveScoring/bagBreakdown';

// 11 is intentionally absent — it is unreachable with 4 bags.
const GRID_LAYOUT = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10, 12],
];

interface ScoreGridProps {
  teamName: string;
  accent: 'blue' | 'red';
  selectedScore: number | null;
  selectedBagsIn: number | undefined;
  onSelectScore: (score: number) => void;
  onSelectBagsIn: (bagsIn: number) => void;
  disabled?: boolean;
}

const accentClasses = {
  blue: 'border-blue-500 bg-blue-500 text-white',
  red: 'border-red-500 bg-red-500 text-white',
};

/**
 * ScoreMagic-style entry: tap the team's round score; scores 3/4/6 can be
 * reached two ways, so an inline "bags in the hole?" prompt disambiguates.
 */
export const ScoreGrid: React.FC<ScoreGridProps> = ({
  teamName,
  accent,
  selectedScore,
  selectedBagsIn,
  onSelectScore,
  onSelectBagsIn,
  disabled = false,
}) => {
  const needsDisambiguation =
    selectedScore !== null && isAmbiguousScore(selectedScore) && selectedBagsIn === undefined;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="truncate text-xs font-semibold">{teamName}</span>
        {selectedScore !== null && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {selectedScore} pts
            {isAmbiguousScore(selectedScore) && selectedBagsIn !== undefined
              ? ` · ${selectedBagsIn} in`
              : ''}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={`${teamName} round score`}>
        {GRID_LAYOUT.flat().map((score) => {
          const isSelected = selectedScore === score;
          const ambiguous = isAmbiguousScore(score);
          return (
            <button
              key={score}
              type="button"
              disabled={disabled}
              onClick={() => onSelectScore(score)}
              aria-pressed={isSelected}
              className={cn(
                'relative min-h-[52px] rounded-md border text-lg font-semibold tabular-nums transition-colors',
                isSelected
                  ? accentClasses[accent]
                  : 'border-border bg-background hover:bg-muted active:scale-95',
                disabled && 'opacity-60'
              )}
            >
              {score}
              {ambiguous && (
                <span
                  className={cn(
                    'absolute right-1 top-1 size-1.5 rounded-full bg-amber-500',
                    isSelected && selectedBagsIn === undefined && 'animate-pulse'
                  )}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      {needsDisambiguation && (
        <div className="mt-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-2">
          <div className="mb-1.5 text-xs font-medium">
            {selectedScore} points — how many bags in the hole?
          </div>
          <div className="flex gap-1.5">
            {getAmbiguousOptions(selectedScore).map((bagsIn) => (
              <button
                key={bagsIn}
                type="button"
                disabled={disabled}
                onClick={() => onSelectBagsIn(bagsIn)}
                className="min-h-[44px] flex-1 rounded-md border border-amber-500 bg-background text-sm font-semibold hover:bg-amber-500/20"
              >
                {bagsIn} in the hole
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

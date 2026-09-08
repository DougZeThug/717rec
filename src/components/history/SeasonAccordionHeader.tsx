import React from 'react';

import { cn } from '@/lib/utils';

import { Season } from './seasonAccordionTypes';

interface SeasonAccordionHeaderProps {
  season: Season;
  dateRange: string | null;
  hasChampions: boolean;
  teamCount: number;
  matchCount: number;
  isLoading: boolean;
  isWinterTheme: boolean;
}

/** "Active" while a season is running, a trophy once it has champions. */
const SeasonStatusPill: React.FC<{
  season: Season;
  hasChampions: boolean;
  isWinterTheme: boolean;
}> = ({ season, hasChampions, isWinterTheme }) => {
  if (season.is_active) {
    return (
      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs font-medium shrink-0">
        Active
      </span>
    );
  }

  if (!hasChampions) return null;

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
        isWinterTheme
          ? 'bg-amber-500/20 text-amber-300'
          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
      )}
    >
      🏆 Completed
    </span>
  );
};

/** "26 teams · 104 matches", with whichever halves there are. */
const SeasonCounts: React.FC<{
  teamCount: number;
  matchCount: number;
  isWinterTheme: boolean;
}> = ({ teamCount, matchCount, isWinterTheme }) => {
  const parts = [
    teamCount > 0 ? `${teamCount} teams` : null,
    matchCount > 0 ? `${matchCount} matches` : null,
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <p className={cn('text-xs mt-0.5', isWinterTheme ? 'text-white/50' : 'text-muted-foreground')}>
      {parts.join(' · ')}
    </p>
  );
};

const SeasonAccordionHeader: React.FC<SeasonAccordionHeaderProps> = ({
  season,
  dateRange,
  hasChampions,
  teamCount,
  matchCount,
  isLoading,
  isWinterTheme,
}) => (
  <div
    className={cn(
      'px-3 pt-3 pb-2 md:px-6 md:pt-5 md:pb-4',
      isWinterTheme ? 'border-b border-white/10' : 'border-b border-border'
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <h3
          className={cn(
            'text-lg md:text-xl font-bebas uppercase tracking-wide leading-tight',
            isWinterTheme ? 'text-white' : 'text-foreground'
          )}
        >
          {season.name}
        </h3>
        {dateRange && (
          <span
            className={cn(
              'text-xs font-inter shrink-0',
              isWinterTheme ? 'text-white/60' : 'text-muted-foreground'
            )}
          >
            {dateRange}
          </span>
        )}
      </div>
      <SeasonStatusPill season={season} hasChampions={hasChampions} isWinterTheme={isWinterTheme} />
    </div>
    {!isLoading && (
      <SeasonCounts teamCount={teamCount} matchCount={matchCount} isWinterTheme={isWinterTheme} />
    )}
  </div>
);

export default SeasonAccordionHeader;

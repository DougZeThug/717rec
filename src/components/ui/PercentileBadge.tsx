import React from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatOrdinal, getPercentileTier, PercentileResult } from '@/utils/percentileUtils';

interface PercentileBadgeProps {
  percentile: number;
  rank?: number;
  total?: number;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
  statName?: string;
}

// Light-theme text is -700/-800, not -600, so each pill reads at 4.5:1 or more on
// its own tint (emerald-700 measured 4.44:1, so emerald-800). Dark stays -400.
const tierStyles: Record<string, string> = {
  elite: 'bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 border-yellow-500/30',
  strong: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border-emerald-500/30',
  average: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
  below: 'bg-muted text-muted-foreground border-border',
  weak: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30',
};

const sizeStyles: Record<string, string> = {
  xs: 'text-xs px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
};

/**
 * Tier-colored pill showing rank or percentile; adds a tooltip when rank and
 * total are given.
 *
 * Module-local on purpose. Called directly it will happily paint a team with
 * nothing to measure a red "0%" pill, because rank 0 falls back to the
 * percentile and tier 0 is the bottom colour. That is what B-62 was. Everything
 * outside this file goes through PercentileFromResult, which holds the guard.
 */
const PercentileBadge: React.FC<PercentileBadgeProps> = ({
  percentile,
  rank,
  total,
  size = 'xs',
  showLabel: _showLabel = true,
  className,
  statName,
}) => {
  const tier = getPercentileTier(percentile);
  // Display rank as ordinal (1st, 2nd, 3rd) instead of percentile
  const displayText = rank ? formatOrdinal(rank) : `${percentile}%`;

  // "of 10 teams in Win %": the tooltip's words after the rank. A screen reader
  // never opens the tooltip, so the pill also carries them as hidden text.
  const outOfText = `of ${total} teams${statName ? ` in ${statName}` : ''}`;
  const tooltipText =
    rank && total
      ? `Ranked ${formatOrdinal(rank)} ${outOfText}`
      : `${percentile}th percentile${statName ? ` in ${statName}` : ''}`;

  /** Pill showing the rank as an ordinal (or percentile), colored by performance tier. */
  const badge = (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border whitespace-nowrap',
        tierStyles[tier],
        sizeStyles[size],
        className
      )}
    >
      {displayText}
      {/* Nested, so the pill's own text stays "3rd" and nothing visible changes. */}
      {rank && total ? <span className="sr-only"> {outOfText}</span> : null}
    </span>
  );

  if (rank && total) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
};

// Convenience component for rendering percentile from a PercentileResult
interface PercentileFromResultProps {
  result: PercentileResult;
  size?: 'xs' | 'sm' | 'md';
  statName?: string;
  className?: string;
}

/** Renders a PercentileBadge from a PercentileResult; renders nothing when total is 0. */
export const PercentileFromResult: React.FC<PercentileFromResultProps> = ({
  result,
  size = 'xs',
  statName,
  className,
}) => {
  if (result.total === 0) return null;

  return (
    <PercentileBadge
      percentile={result.percentile}
      rank={result.rank}
      total={result.total}
      size={size}
      statName={statName}
      className={className}
    />
  );
};

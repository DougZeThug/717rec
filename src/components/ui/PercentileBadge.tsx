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

const tierStyles: Record<string, string> = {
  elite: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  strong: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  average: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  below: 'bg-muted text-muted-foreground border-border',
  weak: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
};

const sizeStyles: Record<string, string> = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
};

export const PercentileBadge: React.FC<PercentileBadgeProps> = ({
  percentile,
  rank,
  total,
  size = 'xs',
  showLabel = true,
  className,
  statName,
}) => {
  const tier = getPercentileTier(percentile);
  // Display rank as ordinal (1st, 2nd, 3rd) instead of percentile
  const displayText = rank ? formatOrdinal(rank) : `${percentile}%`;

  const tooltipText =
    rank && total
      ? `Ranked ${formatOrdinal(rank)} of ${total} teams${statName ? ` in ${statName}` : ''}`
      : `${percentile}th percentile${statName ? ` in ${statName}` : ''}`;

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

export default PercentileBadge;

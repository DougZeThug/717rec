import React from 'react';

import { PercentileFromResult } from '@/components/ui/PercentileBadge';
import { cn } from '@/lib/utils';
import { PercentileResult } from '@/utils/percentileUtils';

interface ComparisonStatRowProps {
  label: string;
  value1: string | number;
  value2: string | number;
  numericValue1?: number;
  numericValue2?: number;
  percentile1?: PercentileResult | null;
  percentile2?: PercentileResult | null;
  higherIsBetter?: boolean;
  showPercentiles?: boolean;
  suffix?: string;
}

/** A row's value as a number, preferring the explicit numeric prop. */
const toNumber = (numeric: number | undefined, value: string | number) =>
  numeric ?? (typeof value === 'number' ? value : parseFloat(String(value)) || 0);

/** Which side the row marks as ahead, or neither when the two are level. */
const pickWinner = (
  num1: number,
  num2: number,
  higherIsBetter: boolean
): 'team1' | 'team2' | 'tie' => {
  if (num1 === num2) return 'tie';
  return (higherIsBetter ? num1 > num2 : num1 < num2) ? 'team1' : 'team2';
};

export const ComparisonStatRow: React.FC<ComparisonStatRowProps> = ({
  label,
  value1,
  value2,
  numericValue1,
  numericValue2,
  percentile1,
  percentile2,
  higherIsBetter = true,
  showPercentiles = true,
  suffix = '',
}) => {
  const winner = pickWinner(
    toNumber(numericValue1, value1),
    toNumber(numericValue2, value2),
    higherIsBetter
  );

  return (
    <div className="grid grid-cols-3 gap-2 py-3 border-b border-border/50 last:border-0">
      {/* Team 1 Value */}
      <div className="flex flex-col items-start gap-1">
        <span
          className={cn(
            'text-base font-semibold tabular-nums',
            winner === 'team1' && 'text-primary'
          )}
        >
          {value1}
          {suffix}
        </span>
        {/* PercentileFromResult, not PercentileBadge: it hides the badge for a
            team with nothing to measure. Called directly, the badge painted that
            team a red "0%" pill, which reads as worst in the league rather than
            not measured. The team page has always gone through this component. */}
        {showPercentiles && percentile1 && (
          <PercentileFromResult result={percentile1} size="xs" statName={label} />
        )}
      </div>

      {/* Stat Label */}
      <div className="flex items-center justify-center">
        <span className="text-xs sm:text-sm text-muted-foreground text-center font-medium">
          {label}
        </span>
      </div>

      {/* Team 2 Value */}
      <div className="flex flex-col items-end gap-1">
        <span
          className={cn(
            'text-base font-semibold tabular-nums',
            winner === 'team2' && 'text-primary'
          )}
        >
          {value2}
          {suffix}
        </span>
        {showPercentiles && percentile2 && (
          <PercentileFromResult result={percentile2} size="xs" statName={label} />
        )}
      </div>
    </div>
  );
};

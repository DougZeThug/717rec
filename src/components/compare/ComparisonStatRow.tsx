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
  // Determine winner
  const num1 =
    numericValue1 ?? (typeof value1 === 'number' ? value1 : parseFloat(String(value1)) || 0);
  const num2 =
    numericValue2 ?? (typeof value2 === 'number' ? value2 : parseFloat(String(value2)) || 0);

  let winner: 'team1' | 'team2' | 'tie' = 'tie';
  if (num1 !== num2) {
    if (higherIsBetter) {
      winner = num1 > num2 ? 'team1' : 'team2';
    } else {
      winner = num1 < num2 ? 'team1' : 'team2';
    }
  }

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

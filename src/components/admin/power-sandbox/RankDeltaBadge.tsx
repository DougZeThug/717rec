import { Minus, MoveDown, MoveUp } from 'lucide-react';
import React from 'react';

/**
 * Colored ↑n / ↓n / – rank-movement indicator, modeled on the migration
 * ComparisonTable's RankChange (which stays untouched — the two tabs render
 * different row shapes).
 */
const RankDeltaBadge: React.FC<{ delta: number }> = ({ delta }) => {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center text-emerald-500 tabular-nums">
        <MoveUp className="size-3" aria-hidden="true" />
        {delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center text-red-500 tabular-nums">
        <MoveDown className="size-3" aria-hidden="true" />
        {Math.abs(delta)}
      </span>
    );
  }
  return <Minus className="size-3 text-muted-foreground" aria-hidden="true" />;
};

export default RankDeltaBadge;

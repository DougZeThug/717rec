import React from 'react';

import { cn } from '@/lib/utils';
import { MATCH_STATUS_LABELS, type MatchStatus } from '@/types/matchStatus';

import { UpsetTag } from '../UpsetTag';

// One pill per state. Keyed on the union minus `scheduled`, which shows no
// pill at all, so a new state fails the typecheck until it is given a colour.
const statusPillClasses: Record<Exclude<MatchStatus, 'scheduled'>, string> = {
  completed: 'bg-primary/10 text-primary',
  postponed: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  canceled: 'bg-destructive/10 text-destructive',
};

interface MatchCardStatusBadgeProps {
  status: MatchStatus;
  isUpsetResult: boolean;
}

/** The word at the top of a card. A scheduled match shows nothing. */
export const MatchCardStatusBadge: React.FC<MatchCardStatusBadgeProps> = ({
  status,
  isUpsetResult,
}) => {
  if (status === 'scheduled') return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-1.5">
      <span
        className={cn(
          'px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full',
          statusPillClasses[status]
        )}
      >
        {MATCH_STATUS_LABELS[status]}
      </span>
      {isUpsetResult && <UpsetTag />}
    </div>
  );
};

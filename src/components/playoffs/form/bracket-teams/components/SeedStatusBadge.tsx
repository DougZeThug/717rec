import { AlertCircle, Clock, Settings, Trophy } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';

interface SeedStatusBadgeProps {
  seed: number;
  isManual?: boolean;
  hasConflict?: boolean;
  isPending?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SeedStatusBadge: React.FC<SeedStatusBadgeProps> = ({
  seed,
  isManual = false,
  hasConflict = false,
  isPending = false,
  size = 'md',
}) => {
  const variant: 'destructive' | 'outline' | 'default' | 'secondary' = hasConflict
    ? 'destructive'
    : isPending
      ? 'outline'
      : isManual
        ? 'default'
        : 'secondary';

  const iconClassName = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const iconNode = hasConflict ? (
    <AlertCircle className={iconClassName} />
  ) : isPending ? (
    <Clock className={iconClassName} />
  ) : isManual ? (
    <Settings className={iconClassName} />
  ) : (
    <Trophy className={iconClassName} />
  );

  // Plain content, never a button: the badge sits inside the team's own button
  // in TeamSelectionForm, and a button inside a button is invalid HTML (and a
  // tap on it used to run both). The Manage Seeds tab is the way to edit seeds.
  return (
    <Badge
      variant={variant}
      className={`
        flex items-center gap-1 font-medium
        ${size === 'sm' ? 'text-xs px-1.5 py-0.5' : ''}
        ${size === 'lg' ? 'text-base px-3 py-1' : ''}
        ${hasConflict ? 'animate-pulse' : ''}
        ${isPending ? 'border-dashed' : ''}
      `}
    >
      {iconNode}
      <span>#{seed}</span>
      {size !== 'sm' && isManual && !hasConflict && (
        <span className="text-xs opacity-75">Manual</span>
      )}
      {size !== 'sm' && hasConflict && <span className="text-xs opacity-75">Conflict</span>}
      {size !== 'sm' && isPending && <span className="text-xs opacity-75">Pending</span>}
    </Badge>
  );
};

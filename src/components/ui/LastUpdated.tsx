import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LastUpdatedProps {
  /** When the data last arrived, in ms (TanStack Query's `dataUpdatedAt`). 0 means never. */
  updatedAt: number;
  /** True while a refresh is under way. */
  isRefreshing: boolean;
  onRefresh: () => void;
  className?: string;
}

/**
 * "Updated 2:41 PM" with a refresh button.
 *
 * League night is when these pages matter most, and the data moves under them.
 * Without this a page gave no hint how old it was and no way to ask for new
 * numbers short of reloading.
 */
export const LastUpdated: React.FC<LastUpdatedProps> = ({
  updatedAt,
  isRefreshing,
  onRefresh,
  className,
}) => {
  if (!updatedAt) return null;

  return (
    <div
      className={cn('flex items-center justify-end gap-1 text-xs text-muted-foreground', className)}
    >
      <span aria-hidden="true">Updated {format(new Date(updatedAt), 'h:mm a')}</span>
      {/* For a screen reader. Seconds are in the text on purpose: the visible
          time changes only on the minute, so two refreshes inside one minute
          would read the same and the second would never be announced. */}
      <span role="status" aria-live="polite" className="sr-only">
        Updated {format(new Date(updatedAt), 'h:mm:ss a')}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh"
      >
        <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} aria-hidden="true" />
      </Button>
    </div>
  );
};

export default LastUpdated;

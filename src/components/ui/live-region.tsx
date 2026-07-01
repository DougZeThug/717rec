import React from 'react';

import { cn } from '@/lib/utils';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  className?: string;
}

/**
 * Visually-hidden ARIA live region for screen-reader announcements.
 * Update `message` to announce a new status; changing the string re-triggers
 * assistive tech.
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  politeness = 'polite',
  className,
}) => (
  <div
    role="status"
    aria-live={politeness}
    aria-atomic="true"
    className={cn(
      'sr-only pointer-events-none absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0',
      className
    )}
  >
    {message}
  </div>
);

export default LiveRegion;
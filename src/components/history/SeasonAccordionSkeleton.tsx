import React from 'react';

import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';

/**
 * Skeleton for SeasonAccordion expanded content
 * Shows division headers with team list placeholders
 */
const SeasonAccordionSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {['season-skel-1', 'season-skel-2', 'season-skel-3'].map((sk) => (
        <div key={sk}>
          {/* Division header */}
          <ShimmerSkeleton className="h-4 w-32 mb-3" />
          {/* Division content card */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            {[`${sk}-row-1`, `${sk}-row-2`, `${sk}-row-3`, `${sk}-row-4`].map((rk) => (
              <div key={rk} className="flex items-center gap-3">
                <ShimmerSkeleton circle className="size-8" />
                <ShimmerSkeleton className="h-4 w-32 flex-1" />
                <ShimmerSkeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SeasonAccordionSkeleton;

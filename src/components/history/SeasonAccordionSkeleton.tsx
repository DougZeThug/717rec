import React from 'react';

import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';

/**
 * Skeleton for SeasonAccordion expanded content
 * Shows division headers with team list placeholders
 */
const SeasonAccordionSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          {/* Division header */}
          <ShimmerSkeleton className="h-4 w-32 mb-3" />
          {/* Division content card */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="flex items-center gap-3">
                <ShimmerSkeleton circle className="w-8 h-8" />
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

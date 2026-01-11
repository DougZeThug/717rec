import React from 'react';

import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';

const HeroCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-card overflow-hidden border border-border bg-card">
      <div className="p-6 md:p-8 space-y-4">
        {/* Title skeleton */}
        <ShimmerSkeleton variant="input" className="h-8 w-2/3" />

        {/* Subtitle skeleton */}
        <ShimmerSkeleton variant="input" className="h-4 w-1/2" />

        {/* Body skeleton */}
        <div className="space-y-2">
          <ShimmerSkeleton variant="input" className="h-4 w-full" />
          <ShimmerSkeleton variant="input" className="h-4 w-5/6" />
          <ShimmerSkeleton variant="input" className="h-4 w-4/6" />
        </div>

        {/* Button skeleton */}
        <ShimmerSkeleton variant="input" className="h-10 w-32" />
      </div>
    </div>
  );
};

export default HeroCardSkeleton;

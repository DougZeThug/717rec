import React from 'react';

import { Card } from '@/components/ui/card';
import { AvatarSkeleton, ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { AutoStagger } from '@/components/ui/staggered-content';

interface TeamListSkeletonProps {
  viewMode: 'grid' | 'list';
}

export const TeamListSkeleton: React.FC<TeamListSkeletonProps> = ({ viewMode }) => {
  const skeletonCount = 3;
  const skeletons = Array.from({ length: skeletonCount }, (_, i) => i);

  if (viewMode === 'list') {
    return (
      <AutoStagger className="space-y-4" staggerDelay={0.08}>
        {skeletons.map((index) => (
          <Card key={index} className="overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-[150px] h-[150px] bg-muted/50 flex items-center justify-center">
                <AvatarSkeleton size="lg" />
              </div>
              <div className="flex flex-col flex-grow p-4 space-y-4">
                <div className="flex justify-between">
                  <ShimmerSkeleton variant="input" className="h-6 w-1/3" />
                  <ShimmerSkeleton variant="input" className="h-6 w-8" />
                </div>
                <ShimmerSkeleton variant="input" className="h-5 w-1/4" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-muted/30 p-2 rounded-input space-y-2">
                      <ShimmerSkeleton variant="input" className="h-4 w-1/2" />
                      <ShimmerSkeleton variant="input" className="h-4 w-2/3" />
                    </div>
                  ))}
                </div>
                <ShimmerSkeleton variant="input" className="h-4 w-3/4 mt-4" />
              </div>
            </div>
          </Card>
        ))}
      </AutoStagger>
    );
  }

  // Grid view skeleton
  return (
    <AutoStagger
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
      staggerDelay={0.08}
    >
      {skeletons.map((index) => (
        <Card key={index} className="overflow-hidden h-[220px] flex flex-col">
          <ShimmerSkeleton variant="card" className="h-24 w-full rounded-none" />
          <div className="p-4 space-y-4 flex-grow">
            <div className="flex justify-between">
              <ShimmerSkeleton variant="input" className="h-5 w-2/3" />
              <ShimmerSkeleton variant="input" className="h-5 w-6" />
            </div>
            <ShimmerSkeleton variant="input" className="h-4 w-1/4" />
            <div className="grid grid-cols-2 gap-2">
              <ShimmerSkeleton variant="input" className="h-14 w-full" />
              <ShimmerSkeleton variant="input" className="h-14 w-full" />
            </div>
            <ShimmerSkeleton variant="input" className="h-4 w-full mt-auto" />
          </div>
        </Card>
      ))}
    </AutoStagger>
  );
};

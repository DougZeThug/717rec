import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const MyNextMatchSkeleton: React.FC = () => {
  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <CardContent className="p-4 md:p-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Match content skeleton */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Team logos */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>

          {/* Team names */}
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* Date/time */}
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* CTA skeleton */}
        <div className="mt-4 flex justify-center">
          <Skeleton className="h-4 w-28" />
        </div>
      </CardContent>
    </Card>
  );
};

export default MyNextMatchSkeleton;

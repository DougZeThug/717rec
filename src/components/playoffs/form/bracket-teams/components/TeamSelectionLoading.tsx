import React from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';

/**
 * Loading state component for team selection
 * Displays skeleton placeholders while team data is being fetched
 */
export const TeamSelectionLoading: React.FC = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <ShimmerSkeleton className="h-6 w-32" />
            <ShimmerSkeleton className="h-5 w-12" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ShimmerSkeleton className="h-2 w-full" />
          <div className="flex items-center justify-between">
            <ShimmerSkeleton className="h-4 w-40" />
            <ShimmerSkeleton className="h-6 w-16" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <ShimmerSkeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <ShimmerSkeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import { Trophy } from 'lucide-react';
import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';

/**
 * Skeleton loader for FinalStandings component.
 * Mirrors the refactored FinalStandings layout: flat row with gap-3,
 * fixed placement width, rounded-md team avatar, and two-line stats block.
 */
const FinalStandingsSkeleton: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5 text-muted-foreground animate-pulse" />
          <ShimmerSkeleton className="h-5 w-32" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3].map((placement) => (
            <div
              key={placement}
              className="flex items-center gap-3 p-3 rounded-lg border"
            >
              {/* Placement number */}
              <ShimmerSkeleton className="w-6 h-6 shrink-0" />
              {/* Placement icon */}
              <ShimmerSkeleton circle className="size-5 shrink-0" />
              {/* Team avatar */}
              <ShimmerSkeleton className="size-9 shrink-0 rounded-md" />
              {/* Team name */}
              <ShimmerSkeleton className="h-4 flex-1" />
              {/* Two-line stats block */}
              <div className="shrink-0 space-y-1 text-right">
                <ShimmerSkeleton className="h-5 w-16 ml-auto" />
                <ShimmerSkeleton className="h-3 w-16 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalStandingsSkeleton;

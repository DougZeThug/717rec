import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { AvatarSkeleton, ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';

// Placeholder for the logo, score, logo row
const SkeletonScoreRow: React.FC = () => (
  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
    {/* Team 1 Logo */}
    <AvatarSkeleton size="md" />

    {/* Score */}
    <div className="flex items-center justify-center">
      <ShimmerSkeleton className="h-8 w-24 rounded-full" />
    </div>

    {/* Team 2 Logo */}
    <AvatarSkeleton size="md" />
  </div>
);

// Placeholder for the team name, spacer, team name row
const SkeletonNameRow: React.FC = () => (
  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
    {/* Team 1 Name */}
    <ShimmerSkeleton className="h-4 w-full" />

    <div className="w-4" />

    {/* Team 2 Name */}
    <ShimmerSkeleton className="h-4 w-full" />
  </div>
);

const MatchCardSkeleton: React.FC = () => {
  return (
    <Card className="overflow-hidden border-border">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          <SkeletonScoreRow />

          <SkeletonNameRow />
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchCardSkeleton;

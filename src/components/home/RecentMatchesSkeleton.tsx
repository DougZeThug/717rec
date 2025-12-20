import React from "react";
import { Card } from "@/components/ui/card";
import { ShimmerSkeleton, AvatarSkeleton } from "@/components/ui/shimmer-skeleton";
import { AutoStagger } from "@/components/ui/staggered-content";

const MatchCardSkeleton = () => {
  return (
    <Card className="group relative overflow-hidden">
      <div className="p-6">
        {/* Teams and Logos */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <AvatarSkeleton size="md" />
            <ShimmerSkeleton variant="input" className="w-24 h-5" />
          </div>
          <ShimmerSkeleton variant="input" className="mx-2 w-8 h-6" />
          <div className="flex items-center gap-4">
            <ShimmerSkeleton variant="input" className="w-24 h-5" />
            <AvatarSkeleton size="md" />
          </div>
        </div>
        
        {/* Match Info */}
        <div className="flex justify-between text-sm mt-4">
          <div className="space-y-2">
            <ShimmerSkeleton variant="input" className="w-28 h-4" />
            <ShimmerSkeleton variant="input" className="w-24 h-4" />
          </div>
          <div className="space-y-2">
            <ShimmerSkeleton variant="input" className="w-16 h-4 ml-auto" />
            <ShimmerSkeleton variant="input" className="w-12 h-4 ml-auto" />
          </div>
        </div>
      </div>
    </Card>
  );
};

const RecentMatchesSkeleton: React.FC = () => {
  return (
    <section id="recent-matches-skeleton" className="mb-12">
      <AutoStagger 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        staggerDelay={0.08}
      >
        {[0, 1, 2].map((index) => (
          <MatchCardSkeleton key={index} />
        ))}
      </AutoStagger>
    </section>
  );
};

export default RecentMatchesSkeleton;

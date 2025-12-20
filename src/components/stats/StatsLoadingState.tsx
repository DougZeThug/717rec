import React from "react";
import { BarChart3 } from "lucide-react";
import { ShimmerSkeleton, CardSkeleton } from "@/components/ui/shimmer-skeleton";
import { StaggerItem, StaggeredContent } from "@/components/ui/staggered-content";
import { AutoStagger } from "@/components/ui/staggered-content";

const StatsLoadingState: React.FC = () => {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header skeleton - appears first */}
        <StaggeredContent>
          <StaggerItem priority="high">
            <div className="flex items-center justify-center gap-4 mb-8">
              <BarChart3 className="h-8 w-8 text-muted-foreground animate-pulse" />
              <ShimmerSkeleton variant="input" className="h-8 w-48" />
            </div>
          </StaggerItem>

          {/* Stats cards grid - staggered appearance */}
          <StaggerItem priority="medium">
            <AutoStagger 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              baseDelay={0.1}
              staggerDelay={0.06}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} hasActions />
              ))}
            </AutoStagger>
          </StaggerItem>
        </StaggeredContent>
      </div>
    </div>
  );
};

export default StatsLoadingState;

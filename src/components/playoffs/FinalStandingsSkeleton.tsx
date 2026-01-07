import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShimmerSkeleton, AvatarSkeleton } from "@/components/ui/shimmer-skeleton";
import { Trophy } from "lucide-react";

/**
 * Skeleton loader for FinalStandings component
 * Matches the structure: Card with header + 3 placement rows
 */
const FinalStandingsSkeleton: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-muted-foreground animate-pulse" />
          <ShimmerSkeleton className="h-5 w-32" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3].map((placement) => (
            <div
              key={placement}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                {/* Placement number */}
                <ShimmerSkeleton className="w-8 h-6" />
                {/* Placement icon */}
                <ShimmerSkeleton circle className="w-5 h-5" />
                {/* Team avatar and name */}
                <div className="flex items-center gap-2">
                  <AvatarSkeleton size="sm" />
                  <ShimmerSkeleton className="h-4 w-24" />
                </div>
              </div>
              {/* Stats */}
              <ShimmerSkeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalStandingsSkeleton;

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TeamStatsSkeleton: React.FC = () => {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Skeleton variant="input" className="h-5 w-24" />
            <Skeleton variant="input" className="h-5 w-12" />
          </div>
          <div className="space-y-2">
            <Skeleton variant="input" className="h-5 w-28" />
            <Skeleton variant="input" className="h-5 w-14" />
          </div>
          <div className="space-y-2">
            <Skeleton variant="input" className="h-5 w-24" />
            <Skeleton variant="input" className="h-5 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton variant="input" className="h-5 w-20" />
            <Skeleton variant="input" className="h-5 w-14" />
          </div>
          <div className="space-y-2">
            <Skeleton variant="input" className="h-5 w-36" />
            <Skeleton variant="input" className="h-5 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton variant="input" className="h-5 w-24" />
            <Skeleton variant="input" className="h-5 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamStatsSkeleton;

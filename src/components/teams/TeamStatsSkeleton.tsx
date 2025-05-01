
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const TeamStatsSkeleton: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  const skeletonClass = cn(
    "h-5 mb-2 rounded",
    isLight ? "bg-gray-200" : "bg-gray-700"
  );

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Skeleton className={cn(skeletonClass, "w-24")} />
            <Skeleton className={cn(skeletonClass, "w-12")} />
          </div>
          <div className="space-y-1">
            <Skeleton className={cn(skeletonClass, "w-28")} />
            <Skeleton className={cn(skeletonClass, "w-14")} />
          </div>
          <div className="space-y-1">
            <Skeleton className={cn(skeletonClass, "w-24")} />
            <Skeleton className={cn(skeletonClass, "w-16")} />
          </div>
          <div className="space-y-1">
            <Skeleton className={cn(skeletonClass, "w-20")} />
            <Skeleton className={cn(skeletonClass, "w-14")} />
          </div>
          <div className="space-y-1">
            <Skeleton className={cn(skeletonClass, "w-36")} />
            <Skeleton className={cn(skeletonClass, "w-16")} />
          </div>
          <div className="space-y-1">
            <Skeleton className={cn(skeletonClass, "w-24")} />
            <Skeleton className={cn(skeletonClass, "w-16")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamStatsSkeleton;

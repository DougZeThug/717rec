
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export const TeamListSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="border rounded-lg overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <div className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-20 w-full mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
};

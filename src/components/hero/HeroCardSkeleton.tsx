import React from "react";
import { cn } from "@/lib/utils";

const HeroCardSkeleton: React.FC = () => {
  return (
    <div className={cn(
      "rounded-xl overflow-hidden shadow-lg animate-pulse",
      "bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200",
      "dark:from-gray-800 dark:via-gray-700 dark:to-gray-800"
    )}>
      <div className="p-6 md:p-8">
        {/* Title skeleton */}
        <div className="h-8 w-2/3 bg-gray-300 dark:bg-gray-600 rounded mb-3" />
        
        {/* Subtitle skeleton */}
        <div className="h-4 w-1/2 bg-gray-300 dark:bg-gray-600 rounded mb-4" />
        
        {/* Body skeleton */}
        <div className="space-y-2 mb-6">
          <div className="h-3 w-full bg-gray-300 dark:bg-gray-600 rounded" />
          <div className="h-3 w-5/6 bg-gray-300 dark:bg-gray-600 rounded" />
          <div className="h-3 w-4/6 bg-gray-300 dark:bg-gray-600 rounded" />
        </div>
        
        {/* Button skeleton */}
        <div className="h-10 w-32 bg-gray-300 dark:bg-gray-600 rounded" />
      </div>
    </div>
  );
};

export default HeroCardSkeleton;


import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const MatchCardSkeleton = () => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-200", 
      "bg-gradient-to-br border",
      isLight 
        ? "from-gray-50 to-gray-100 border-gray-200" 
        : "from-gray-800/50 to-gray-900/50 border-gray-700"
    )}>
      <div className="p-6">
        {/* Teams and Logos */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <Skeleton className={cn(
              "w-10 h-10", 
              isLight ? "bg-gray-200" : "bg-gray-700"
            )} />
            <Skeleton className={cn(
              "ml-3 w-24 h-5",
              isLight ? "bg-gray-200" : "bg-gray-700"
            )} />
          </div>
          <Skeleton className={cn(
            "mx-2 w-8 h-6",
            isLight ? "bg-gray-200" : "bg-gray-700"
          )} />
          <div className="flex items-center">
            <Skeleton className={cn(
              "mr-3 w-24 h-5",
              isLight ? "bg-gray-200" : "bg-gray-700"
            )} />
            <Skeleton className={cn(
              "w-10 h-10", 
              isLight ? "bg-gray-200" : "bg-gray-700"
            )} />
          </div>
        </div>
        
        {/* Match Info */}
        <div className="flex justify-between text-sm mt-4">
          <div>
            <Skeleton className={cn(
              "w-28 h-4 mb-2",
              isLight ? "bg-gray-200" : "bg-gray-700"
            )} />
            <Skeleton className={cn(
              "w-24 h-4",
              isLight ? "bg-gray-200" : "bg-gray-700"
            )} />
          </div>
          <div className="text-right">
            <Skeleton className={cn(
              "w-16 h-4 mb-2 ml-auto",
              isLight ? "bg-gray-200" : "bg-gray-700"
            )} />
            <Skeleton className={cn(
              "w-12 h-4 ml-auto",
              isLight ? "bg-gray-200" : "bg-gray-700"
            )} />
          </div>
        </div>
      </div>
    </Card>
  );
};

const RecentMatchesSkeleton: React.FC = () => {
  return (
    <section id="recent-matches-skeleton" className="mb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((item) => (
          <MatchCardSkeleton key={item} />
        ))}
      </div>
    </section>
  );
};

export default RecentMatchesSkeleton;

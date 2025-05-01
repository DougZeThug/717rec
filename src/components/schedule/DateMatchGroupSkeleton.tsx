
import React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import MatchCardSkeleton from "./MatchCardSkeleton";

interface DateMatchGroupSkeletonProps {
  matchCount?: number;
}

const DateMatchGroupSkeleton: React.FC<DateMatchGroupSkeletonProps> = ({ matchCount = 2 }) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  return (
    <Collapsible
      open={true}
      className="mb-4 overflow-hidden font-inter"
    >
      <CollapsibleTrigger 
        className={cn(
          "flex w-full items-center justify-between p-4 text-left font-semibold text-sm rounded-t",
          isLight 
            ? "bg-gray-50 text-gray-700 shadow-sm border-b border-gray-200" 
            : "bg-gray-800 text-white border-gray-700"
        )}
      >
        <Skeleton className={cn(
          "h-4 w-36",
          isLight ? "bg-gray-200" : "bg-gray-700"
        )} />
        <Skeleton className={cn(
          "h-4 w-4",
          isLight ? "bg-gray-200" : "bg-gray-700"
        )} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: matchCount }).map((_, index) => (
            <MatchCardSkeleton key={index} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default DateMatchGroupSkeleton;

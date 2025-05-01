
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const MatchCardSkeleton: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200",
      isLight 
        ? "from-gray-50 to-gray-100 border-gray-200" 
        : "from-gray-800/50 to-gray-900/50 border-gray-700"
    )}>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
            {/* Team 1 Logo */}
            <Skeleton className={cn(
              "w-10 h-10",
              isLight ? "bg-gray-200" : "bg-gray-700"
            )} />
            
            {/* Score */}
            <div className="flex items-center justify-center">
              <Skeleton className={cn(
                "h-8 w-24 rounded-full",
                isLight ? "bg-gray-200" : "bg-gray-700"
              )} />
            </div>
            
            {/* Team 2 Logo */}
            <Skeleton className={cn(
              "w-10 h-10",
              isLight ? "bg-gray-200" : "bg-gray-700"
            )} />
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            {/* Team 1 Name */}
            <Skeleton className={cn(
              "h-4 w-full",
              isLight ? "bg-gray-200" : "bg-gray-700"
            )} />
            
            <div className="w-4"></div>
            
            {/* Team 2 Name */}
            <Skeleton className={cn(
              "h-4 w-full",
              isLight ? "bg-gray-200" : "bg-gray-700"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchCardSkeleton;

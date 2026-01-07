import React from "react";
import { ShimmerSkeleton, AvatarSkeleton } from "@/components/ui/shimmer-skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * Skeleton for MatchesTable component
 * Shows date groups with match card placeholders
 */
const MatchesTableSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {[1, 2].map((groupIndex) => (
        <Collapsible key={groupIndex} open={true} className="overflow-hidden">
          <CollapsibleTrigger
            className={cn(
              "flex w-full items-center justify-between p-4 text-left font-semibold text-sm rounded-t",
              "bg-muted/50 border-b"
            )}
          >
            <ShimmerSkeleton className="h-4 w-36" />
            <ShimmerSkeleton className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((matchIndex) => (
                <div
                  key={matchIndex}
                  className="border rounded-lg p-4 bg-card"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Team 1 */}
                    <div className="flex items-center gap-2 flex-1">
                      <AvatarSkeleton size="sm" />
                      <ShimmerSkeleton className="h-4 w-24" />
                    </div>
                    
                    {/* Scores */}
                    <div className="flex items-center gap-2">
                      <ShimmerSkeleton className="h-10 w-14" />
                      <span className="text-muted-foreground">-</span>
                      <ShimmerSkeleton className="h-10 w-14" />
                    </div>
                    
                    {/* Team 2 */}
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <ShimmerSkeleton className="h-4 w-24" />
                      <AvatarSkeleton size="sm" />
                    </div>
                  </div>
                  
                  {/* Actions row */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <ShimmerSkeleton className="h-5 w-20" />
                    <ShimmerSkeleton className="h-8 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
};

export default MatchesTableSkeleton;

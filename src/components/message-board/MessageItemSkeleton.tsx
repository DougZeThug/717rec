import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { gradients } from "@/styles/design-system";

interface MessageItemSkeletonProps {
  className?: string;
}

const MessageItemSkeleton: React.FC<MessageItemSkeletonProps> = ({ className }) => {
  return (
    <Card className={cn(
      "mb-2 overflow-hidden border shadow-sm",
      gradients.card.default,
      className
    )}>
      <CardContent className="p-3">
        {/* Header: Avatar, username, team, time */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Avatar */}
            <Skeleton className="h-8 w-8 rounded-full" />
            {/* Username */}
            <Skeleton className="h-4 w-24" />
            {/* Team badge */}
            <Skeleton className="h-5 w-16 rounded-full" variant="pill" />
          </div>
          {/* Timestamp */}
          <Skeleton className="h-3 w-12" />
        </div>
        
        {/* Message content - multiple lines */}
        <div className="space-y-2 mt-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        
        {/* Reactions area */}
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-6 w-12 rounded-full" variant="pill" />
          <Skeleton className="h-6 w-10 rounded-full" variant="pill" />
        </div>
      </CardContent>
    </Card>
  );
};

export default MessageItemSkeleton;

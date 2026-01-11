import { Star } from 'lucide-react';
import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const TeamOfTheWeekSkeleton: React.FC = () => {
  return (
    <Card className="relative overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-orange-500/5">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/10 opacity-50" />

      <CardContent className="relative p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500/50" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600/50 dark:text-amber-400/50">
              Team of the Week
            </span>
          </div>
          <Skeleton className="h-5 w-16" />
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {/* Logo skeleton */}
          <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />

          {/* Team info skeleton */}
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-24" />
          </div>

          {/* Score skeleton */}
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamOfTheWeekSkeleton;

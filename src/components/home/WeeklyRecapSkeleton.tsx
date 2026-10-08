import { ClipboardList } from 'lucide-react';
import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const WeeklyRecapHeaderSkeleton: React.FC = () => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <ClipboardList className="size-4 text-violet-500/50" />
      <span className="text-xs font-semibold uppercase tracking-wider text-violet-600/50 dark:text-violet-400/50">
        Weekly Recap
      </span>
    </div>
    <Skeleton className="h-5 w-16" />
  </div>
);

const WeeklyRecapRowSkeleton: React.FC<{ nameWidth: string; badgeWidth: string }> = ({
  nameWidth,
  badgeWidth,
}) => (
  <div className="flex items-center gap-3">
    <Skeleton className="size-8 rounded-full shrink-0" />
    <Skeleton className={`h-4 ${nameWidth}`} />
    <Skeleton className={`h-5 ${badgeWidth} ml-auto`} />
  </div>
);

const WeeklyRecapSkeleton: React.FC = () => {
  return (
    <Card
      className="relative overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-background to-indigo-500/5"
      style={{ minHeight: '160px', contain: 'layout style' }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-indigo-500/10 opacity-50" />

      <CardContent className="relative p-4 md:p-6">
        {/* Header */}
        <WeeklyRecapHeaderSkeleton />

        {/* Row skeletons */}
        <div className="space-y-3">
          <WeeklyRecapRowSkeleton nameWidth="w-48" badgeWidth="w-14" />
          <WeeklyRecapRowSkeleton nameWidth="w-36" badgeWidth="w-10" />
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyRecapSkeleton;

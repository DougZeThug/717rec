import { Trophy } from 'lucide-react';
import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { useTeamBadges } from '@/hooks/useTeamBadges';
import { cn } from '@/lib/utils';
import { TeamBadgeEvent } from '@/types/badges';
import { getBadgeConfig } from '@/utils/badgeConfig';
import { errorLog } from '@/utils/logger';

import { TeamBadge } from './TeamBadge';

interface TeamBadgeCollectionProps {
  teamId: string;
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  showEmptyState?: boolean;
  prefetchedBadges?: TeamBadgeEvent[];
}

const TeamBadgeCollection: React.FC<TeamBadgeCollectionProps> = ({
  teamId,
  size = 'md',
  maxDisplay = 6,
  orientation = 'horizontal',
  className,
  showEmptyState = false,
  prefetchedBadges,
}) => {
  // Skip the per-team query when prefetched data is provided
  const { data: fetchedBadges, isLoading, error } = useTeamBadges(
    prefetchedBadges !== undefined ? '' : teamId
  );

  const badges = prefetchedBadges ?? fetchedBadges;

  if (!prefetchedBadges && isLoading) {
    return (
      <div
        className={cn(
          'flex gap-1',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
          className
        )}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8',
              'rounded-lg'
            )}
          />
        ))}
      </div>
    );
  }

  if (!prefetchedBadges && error) {
    errorLog('Error loading badges:', error);
    return null;
  }

  if (!badges || badges.length === 0) {
    if (!showEmptyState) {
      return null;
    }
    return (
      <div className="text-center py-6">
        <Trophy className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No achievements yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Keep competing to earn badges and trophies!
        </p>
      </div>
    );
  }

  // Sort badges by priority: championships first, then by date
  const sortedBadges = [...badges].sort((a, b) => {
    const configA = getBadgeConfig(a.badge_type);
    const configB = getBadgeConfig(b.badge_type);

    // Championships first
    if (configA.category === 'championship' && configB.category !== 'championship') return -1;
    if (configA.category !== 'championship' && configB.category === 'championship') return 1;

    // Then by awarded date (most recent first)
    return new Date(b.awarded_at).getTime() - new Date(a.awarded_at).getTime();
  });

  // Limit display
  const displayBadges = maxDisplay ? sortedBadges.slice(0, maxDisplay) : sortedBadges;
  const hiddenCount = badges.length - displayBadges.length;

  return (
    <div
      className={cn(
        'flex gap-1 items-center',
        orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        className
      )}
    >
      {displayBadges.map((badgeEvent) => (
        <TeamBadge key={badgeEvent.id} badge={badgeEvent} size={size} />
      ))}
      {hiddenCount > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium',
            size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8'
          )}
        >
          +{hiddenCount}
        </div>
      )}
    </div>
  );
};

export default TeamBadgeCollection;

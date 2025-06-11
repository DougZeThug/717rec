
import React from 'react';
import { cn } from '@/lib/utils';
import { useTeamBadges } from '@/hooks/useTeamBadges';
import { getBadgeConfig } from '@/utils/badgeConfig';
import TeamBadge from './TeamBadge';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamBadgeCollectionProps {
  teamId: string;
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const TeamBadgeCollection: React.FC<TeamBadgeCollectionProps> = ({
  teamId,
  size = 'md',
  maxDisplay = 6,
  orientation = 'horizontal',
  className
}) => {
  const { data: badges, isLoading, error } = useTeamBadges(teamId);

  if (isLoading) {
    return (
      <div className={cn(
        'flex gap-1',
        orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        className
      )}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className={cn(
            size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8',
            'rounded-lg'
          )} />
        ))}
      </div>
    );
  }

  if (error) {
    console.error('Error loading badges:', error);
    return null;
  }

  if (!badges || badges.length === 0) {
    return null;
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
    <div className={cn(
      'flex gap-1 items-center',
      orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
      className
    )}>
      {displayBadges.map((badgeEvent) => (
        <TeamBadge
          key={badgeEvent.id}
          badgeType={badgeEvent.badge_type}
          badgeEvent={badgeEvent}
          size={size}
        />
      ))}
      {hiddenCount > 0 && (
        <div className={cn(
          'flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium',
          size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8'
        )}>
          +{hiddenCount}
        </div>
      )}
    </div>
  );
};

export default TeamBadgeCollection;

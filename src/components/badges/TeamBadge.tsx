
import React from 'react';
import { TeamBadgeEvent } from '@/types/badges';
import { getBadgeConfig } from '@/utils/badgeConfig';
import { cn } from '@/lib/utils';

interface TeamBadgeProps {
  badge: TeamBadgeEvent;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  className?: string;
}

export const TeamBadge: React.FC<TeamBadgeProps> = ({
  badge,
  size = 'md',
  showDescription = false,
  className
}) => {
  const config = getBadgeConfig(badge.badge_type);
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Extract streak count from metadata for streak badges
  const getStreakCount = (): number | null => {
    if (badge.badge_type === 'hot_streak' || badge.badge_type === 'cold_streak') {
      return (badge.metadata as any)?.streak_count || null;
    }
    return null;
  };

  // Extract power score difference for kingslayer badge
  const getPowerScoreDiff = (): number | null => {
    if (badge.badge_type === 'king_slayer') {
      return (badge.metadata as any)?.power_score_diff || null;
    }
    return null;
  };

  const streakCount = getStreakCount();
  const powerScoreDiff = getPowerScoreDiff();

  // Enhanced description for special badges
  const getEnhancedDescription = (): string => {
    if (streakCount && (badge.badge_type === 'hot_streak' || badge.badge_type === 'cold_streak')) {
      const streakType = badge.badge_type === 'hot_streak' ? 'winning' : 'losing';
      return `Currently on a ${streakType} streak of ${streakCount} matches`;
    }
    
    if (powerScoreDiff && badge.badge_type === 'king_slayer') {
      return `Defeated an opponent with ${powerScoreDiff.toFixed(1)} higher power score`;
    }
    
    return config.description;
  };

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full',
        `bg-gradient-to-br ${config.gradient}`,
        sizeClasses[size],
        'shadow-sm border-2 border-white',
        'group cursor-help',
        className
      )}
      title={showDescription ? getEnhancedDescription() : config.name}
    >
      <IconComponent className={cn('text-white', iconSizes[size])} />
      
      {/* Streak count indicator for streak badges */}
      {streakCount && (
        <div className="absolute -top-1 -right-1 bg-white text-gray-800 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center border border-gray-200">
          {streakCount}
        </div>
      )}
      
      {/* Power score difference indicator for kingslayer badge */}
      {powerScoreDiff && (
        <div className="absolute -top-1 -right-1 bg-white text-red-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border border-red-200">
          +{powerScoreDiff.toFixed(1)}
        </div>
      )}
      
      {/* Tooltip for hover */}
      {showDescription && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 pointer-events-none">
          <div className="font-semibold">{config.name}</div>
          <div className="text-gray-300">{getEnhancedDescription()}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { TeamBadgeEvent } from '@/types/badges';
import { getBadgeConfig } from '@/utils/badgeConfig';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const sizeClasses = {
    sm: isMobile ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-xs',
    md: isMobile ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-sm',
    lg: isMobile ? 'w-12 h-12 text-base' : 'w-10 h-10 text-base'
  };

  const iconSizes = {
    sm: isMobile ? 'w-4 h-4' : 'w-3 h-3',
    md: isMobile ? 'w-5 h-5' : 'w-4 h-4',
    lg: isMobile ? 'w-6 h-6' : 'w-5 h-5'
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

  // Extract clutch wins count for clutch performer badge
  const getClutchWinsCount = (): number | null => {
    if (badge.badge_type === 'clutch_performer') {
      return (badge.metadata as any)?.clutch_wins_count || null;
    }
    return null;
  };

  // Extract teams beaten count for consistent performer badge
  const getTeamsBeatenCount = (): number | null => {
    if (badge.badge_type === 'consistent_performer') {
      return (badge.metadata as any)?.teams_beaten_count || null;
    }
    return null;
  };

  // Format championship badge description with season context
  const getChampionshipDescription = (): string => {
    const isChampionshipBadge = badge.badge_type.includes('champion') || 
                               badge.badge_type.includes('runner_up') || 
                               badge.badge_type.includes('third_place');
    
    if (!isChampionshipBadge) {
      return config.description;
    }

    // Extract season and division info from badge metadata or awarded date
    const seasonYear = new Date(badge.awarded_at).getFullYear();
    const seasonName = `${seasonYear}`;
    
    // Parse division from badge type
    let division = '';
    let placement = '';
    
    if (badge.badge_type.includes('recreational')) {
      division = 'Recreational';
    } else if (badge.badge_type.includes('intermediate')) {
      division = 'Intermediate';
    } else if (badge.badge_type.includes('competitive')) {
      division = 'Competitive';
    }
    
    if (badge.badge_type.includes('champion')) {
      placement = 'Champion';
    } else if (badge.badge_type.includes('runner_up')) {
      placement = 'Runner-up';
    } else if (badge.badge_type.includes('third_place')) {
      placement = 'Third Place';
    }
    
    return `${seasonName} ${division} ${placement}`;
  };

  const streakCount = getStreakCount();
  const powerScoreDiff = getPowerScoreDiff();
  const clutchWinsCount = getClutchWinsCount();
  const teamsBeatenCount = getTeamsBeatenCount();

  // Enhanced description for special badges
  const getEnhancedDescription = (): string => {
    // For championship badges, show contextual season/division info
    const isChampionshipBadge = badge.badge_type.includes('champion') || 
                               badge.badge_type.includes('runner_up') || 
                               badge.badge_type.includes('third_place');
    
    if (isChampionshipBadge) {
      return getChampionshipDescription();
    }

    if (streakCount && (badge.badge_type === 'hot_streak' || badge.badge_type === 'cold_streak')) {
      const streakType = badge.badge_type === 'hot_streak' ? 'winning' : 'losing';
      return `Currently on a ${streakType} streak of ${streakCount} matches`;
    }
    
    if (powerScoreDiff && badge.badge_type === 'king_slayer') {
      return `Defeated an opponent with ${powerScoreDiff.toFixed(1)} higher power score`;
    }

    if (clutchWinsCount && badge.badge_type === 'clutch_performer') {
      return `Achieved ${clutchWinsCount} clutch victories (2-1 wins) this season`;
    }

    if (teamsBeatenCount && badge.badge_type === 'consistent_performer') {
      return `Beat ${teamsBeatenCount} different teams within their division this season`;
    }
    
    return config.description;
  };

  const BadgeContent = (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full',
        `bg-gradient-to-br ${config.gradient}`,
        sizeClasses[size],
        'shadow-sm border-2 border-white',
        isMobile ? 'cursor-pointer active:scale-95 transition-transform' : 'cursor-help',
        className
      )}
      onClick={isMobile ? () => setIsDialogOpen(true) : undefined}
    >
      <IconComponent className={cn('text-white', iconSizes[size])} />
      
      {streakCount && (
        <div className="absolute -top-1 -right-1 bg-white text-gray-800 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center border border-gray-200">
          {streakCount}
        </div>
      )}
      
      {powerScoreDiff && (
        <div className="absolute -top-1 -right-1 bg-white text-red-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border border-red-200">
          +{powerScoreDiff.toFixed(1)}
        </div>
      )}

      {clutchWinsCount && (
        <div className="absolute -top-1 -right-1 bg-white text-green-600 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center border border-green-200">
          {clutchWinsCount}
        </div>
      )}

      {teamsBeatenCount && (
        <div className="absolute -top-1 -right-1 bg-white text-blue-600 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center border border-blue-200">
          {teamsBeatenCount}
        </div>
      )}
    </div>
  );

  // Mobile: Use dialog for tap interaction
  if (isMobile) {
    return (
      <>
        {BadgeContent}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div
                  className={cn(
                    'relative inline-flex items-center justify-center rounded-full',
                    `bg-gradient-to-br ${config.gradient}`,
                    'w-16 h-16 shadow-lg border-2 border-white'
                  )}
                >
                  <IconComponent className="text-white w-8 h-8" />
                </div>
              </div>
              <DialogTitle className="text-lg font-semibold">
                {config.name}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-2">
                {getEnhancedDescription()}
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop: Use tooltip for hover interaction
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {BadgeContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="font-semibold">{config.name}</div>
          <div className="text-gray-300 text-xs mt-1">{getEnhancedDescription()}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

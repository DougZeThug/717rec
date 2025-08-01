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
  const config = getBadgeConfig(badge.badge_type, badge);
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


  // Enhanced description for special badges
  const getEnhancedDescription = (): string => {
    // For championship badges, show contextual season/division info
    const isChampionshipBadge = badge.badge_type.includes('champion') || 
                               badge.badge_type.includes('runner_up') || 
                               badge.badge_type.includes('third_place');
    
    if (isChampionshipBadge) {
      return getChampionshipDescription();
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

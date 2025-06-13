
import React from 'react';
import { cn } from '@/lib/utils';
import { getBadgeConfig } from '@/utils/badgeConfig';
import { TeamBadgeEvent, BadgeType } from '@/types/badges';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TeamBadgeProps {
  badgeType: BadgeType;
  badgeEvent?: TeamBadgeEvent;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const TeamBadge: React.FC<TeamBadgeProps> = ({ 
  badgeType, 
  badgeEvent,
  size = 'md', 
  showTooltip = true,
  className 
}) => {
  const config = getBadgeConfig(badgeType);
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const badge = (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-lg shadow-sm border border-white/20',
        'bg-gradient-to-br',
        config.bgColor,
        sizeClasses[size],
        className
      )}
    >
      <div className={cn('absolute inset-0 rounded-lg bg-gradient-to-br opacity-80', config.gradient)} />
      <IconComponent 
        className={cn(
          'relative z-10 text-white drop-shadow-sm',
          iconSizeClasses[size]
        )} 
      />
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  const tooltipContent = (
    <div className="text-center">
      <div className="font-semibold">{config.name}</div>
      <div className="text-sm text-muted-foreground">{config.description}</div>
      {badgeEvent?.awarded_at && (
        <div className="text-xs text-muted-foreground mt-1">
          Earned: {new Date(badgeEvent.awarded_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TeamBadge;

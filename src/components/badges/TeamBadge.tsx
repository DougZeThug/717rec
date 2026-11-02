import React, { useRef, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';
import { TeamBadgeEvent } from '@/types/badges';
import { getBadgeConfig } from '@/utils/badgeConfig';

interface TeamBadgeProps {
  badge: TeamBadgeEvent;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  className?: string;
  /**
   * Set false where the badge sits inside a link (or another button). A button
   * there would be nested interactive content, which is invalid and breaks both
   * the click and the keyboard. The badge then stays a plain tooltip target.
   */
  interactive?: boolean;
}

// Large badge icon shown at the top of the mobile detail dialog
const DialogBadgeIcon: React.FC<{
  gradient: string;
  IconComponent: React.ComponentType<{ className?: string }>;
}> = ({ gradient, IconComponent }) => (
  <div className="flex justify-center mb-4">
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full',
        `bg-gradient-to-br ${gradient}`,
        'size-16 shadow-lg border-2 border-white'
      )}
    >
      <IconComponent className="text-white size-8" />
    </div>
  </div>
);

// Content of the mobile detail dialog (rendered inside <Dialog>)
const BadgeDialogBody: React.FC<{
  gradient: string;
  IconComponent: React.ComponentType<{ className?: string }>;
  name: string;
  description: string;
  onCloseAutoFocus: (event: Event) => void;
}> = ({ gradient, IconComponent, name, description, onCloseAutoFocus }) => (
  <DialogContent className="sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
    <DialogHeader className="text-center">
      <DialogBadgeIcon gradient={gradient} IconComponent={IconComponent} />
      <DialogTitle className="text-lg font-semibold">{name}</DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground mt-2">
        {description}
      </DialogDescription>
    </DialogHeader>
  </DialogContent>
);

export const TeamBadge: React.FC<TeamBadgeProps> = ({
  badge,
  size = 'md',
  showDescription: _showDescription = false,
  className,
  interactive = true,
}) => {
  const config = getBadgeConfig(badge.badge_type, badge);
  const IconComponent = config.icon;
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const sizeClasses = {
    sm: isMobile ? 'size-8 text-xs' : 'size-6 text-xs',
    md: isMobile ? 'size-10 text-sm' : 'size-8 text-sm',
    lg: isMobile ? 'size-12 text-base' : 'size-10 text-base',
  };

  const iconSizes = {
    sm: isMobile ? 'size-4' : 'size-3',
    md: isMobile ? 'size-5' : 'size-4',
    lg: isMobile ? 'size-6' : 'size-5',
  };

  // Format championship badge description with season context
  const getChampionshipDescription = (): string => {
    const isChampionshipBadge =
      badge.badge_type.includes('champion') ||
      badge.badge_type.includes('runner_up') ||
      badge.badge_type.includes('third_place');

    if (!isChampionshipBadge) {
      // skipcq: TCV-001 -- unreachable: getEnhancedDescription only calls this
      // after it has already matched a champion, runner_up or third_place badge.
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
    const isChampionshipBadge =
      badge.badge_type.includes('champion') ||
      badge.badge_type.includes('runner_up') ||
      badge.badge_type.includes('third_place');

    if (isChampionshipBadge) {
      return getChampionshipDescription();
    }

    return config.description;
  };

  const isChampionshipBadge =
    badge.badge_type.includes('champion') ||
    badge.badge_type.includes('runner_up') ||
    badge.badge_type.includes('third_place');

  // Only a phone tap opens the detail dialog; the desktop badge is a hover
  // tooltip with nothing to press, so it stays a plain element there.
  const opensDialog = interactive && isMobile;

  const badgeClassName = cn(
    'relative inline-flex items-center justify-center rounded-full',
    `bg-gradient-to-br ${config.gradient}`,
    sizeClasses[size],
    'shadow-xs border-2 border-white',
    'transition-all duration-200',
    // Championship badges get hover glow
    isChampionshipBadge && 'hover:shadow-lg hover:shadow-yellow-400/30 hover:scale-105',
    opensDialog ? 'cursor-pointer active:scale-95' : 'cursor-help hover:scale-105',
    className
  );
  const badgeIcon = <IconComponent className={cn('text-white', iconSizes[size])} />;

  // A real button, so Tab reaches it and Enter or Space opens the dialog.
  // hit-area-44 grows the tap area to 44px without changing the drawn size.
  const BadgeContent = opensDialog ? (
    <button
      ref={buttonRef}
      type="button"
      aria-label={config.name}
      aria-haspopup="dialog"
      onClick={() => setIsDialogOpen(true)}
      className={cn(
        badgeClassName,
        'hit-area-44',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
    >
      {badgeIcon}
    </button>
  ) : (
    <div className={badgeClassName}>{badgeIcon}</div>
  );

  // Mobile: Use dialog for tap interaction
  if (opensDialog) {
    return (
      <>
        {BadgeContent}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <BadgeDialogBody
            gradient={config.gradient}
            IconComponent={IconComponent}
            name={config.name}
            description={getEnhancedDescription()}
            // Radix hands focus back to a Dialog.Trigger, and this dialog has
            // none, so without this a keyboard user lands on the page top.
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              buttonRef.current?.focus();
            }}
          />
        </Dialog>
      </>
    );
  }

  // Desktop, or inside a link: a hover tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{BadgeContent}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="font-semibold">{config.name}</div>
          <div className="text-gray-300 text-xs mt-1">{getEnhancedDescription()}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

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
import { BadgeConfig, TeamBadgeEvent } from '@/types/badges';
import { getBadgeConfig } from '@/utils/badgeConfig';

interface TeamBadgeProps {
  badge: TeamBadgeEvent;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  className?: string;
  /**
   * Set false where the badge sits inside a link (or another button). A button
   * there would be nested interactive content, which is invalid and breaks both
   * the click and the keyboard. The badge then stays a plain tooltip target
   * with no tab stop.
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

type BadgeSize = NonNullable<TeamBadgeProps['size']>;
type SizeTable = Record<'mobile' | 'desktop', Record<BadgeSize, string>>;

// Size tables, built once. A phone gets bigger badges than a desktop.
const SIZE_CLASSES: SizeTable = {
  mobile: { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-12 text-base' },
  desktop: { sm: 'size-6 text-xs', md: 'size-8 text-sm', lg: 'size-10 text-base' },
};

const ICON_SIZES: SizeTable = {
  mobile: { sm: 'size-4', md: 'size-5', lg: 'size-6' },
  desktop: { sm: 'size-3', md: 'size-4', lg: 'size-5' },
};

const pickBySize = (table: SizeTable, size: BadgeSize, isMobile: boolean): string =>
  table[isMobile ? 'mobile' : 'desktop'][size];

// Badge type text -> label. The first match wins, so the order matters.
type LabelTable = ReadonlyArray<readonly [string, string]>;

const DIVISION_LABELS: LabelTable = [
  ['recreational', 'Recreational'],
  ['intermediate', 'Intermediate'],
  ['competitive', 'Competitive'],
];

const PLACEMENT_LABELS: LabelTable = [
  ['champion', 'Champion'],
  ['runner_up', 'Runner-up'],
  ['third_place', 'Third Place'],
];

const findLabel = (badgeType: string, labels: LabelTable): string =>
  labels.find(([key]) => badgeType.includes(key))?.[1] ?? '';

// A championship badge is any badge that has a placement in its type
const isChampionshipType = (badgeType: string): boolean =>
  PLACEMENT_LABELS.some(([key]) => badgeType.includes(key));

// Format championship badge description with season context
const describeChampionship = (badge: TeamBadgeEvent): string => {
  // Extract season and division info from badge metadata or awarded date
  const seasonYear = new Date(badge.awarded_at).getFullYear();
  const seasonName = `${seasonYear}`;

  // Parse division and placement from badge type
  const division = findLabel(badge.badge_type, DIVISION_LABELS);
  const placement = findLabel(badge.badge_type, PLACEMENT_LABELS);

  return `${seasonName} ${division} ${placement}`;
};

// Enhanced description for special badges: championship badges show contextual
// season/division info, every other badge shows its plain description.
const describeBadge = (badge: TeamBadgeEvent, config: Pick<BadgeConfig, 'description'>): string =>
  isChampionshipType(badge.badge_type) ? describeChampionship(badge) : config.description;

// Outside a link the badge is a real button on every screen size, so Tab
// reaches it and a press (Enter, Space or a click) opens the detail dialog.
// A phone has no hover, so its button needs no tooltip. Desktop keeps the
// tooltip on hover and shows it on keyboard focus too.
const getBadgeMode = (interactive: boolean, isMobile: boolean) => ({
  opensDialog: interactive,
  showsTooltip: !interactive || !isMobile,
});

interface BadgeClassOptions {
  gradient: string;
  size: BadgeSize;
  isMobile: boolean;
  isChampionship: boolean;
  opensDialog: boolean;
  className?: string;
}

const buildBadgeClassName = ({
  gradient,
  size,
  isMobile,
  isChampionship,
  opensDialog,
  className,
}: BadgeClassOptions): string =>
  cn(
    'relative inline-flex items-center justify-center rounded-full',
    `bg-gradient-to-br ${gradient}`,
    pickBySize(SIZE_CLASSES, size, isMobile),
    'shadow-xs border-2 border-white',
    'transition-all duration-200',
    // Championship badges get hover glow
    isChampionship && 'hover:shadow-lg hover:shadow-yellow-400/30 hover:scale-105',
    opensDialog ? 'cursor-pointer active:scale-95' : 'cursor-help hover:scale-105',
    opensDialog && !isMobile && 'hover:scale-105',
    className
  );

const buildButtonClassName = (badgeClassName: string, isMobile: boolean): string =>
  cn(
    badgeClassName,
    // hit-area-44 grows the tap area to 44px without changing the drawn size. It
    // is phone-only: on desktop the 44px areas of neighbouring badges would
    // overlap and the hover tooltip would open from the gap between them.
    isMobile && 'hit-area-44',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
  );

// The tooltip state, the button and the focus hand-back after the dialog closes.
const useBadgeFocusRestore = () => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // True while focus goes back to the button after the dialog closes. Radix
  // opens a tooltip on any focus, and that one would stay on screen after a
  // mouse user closes the dialog.
  const restoringFocusRef = useRef(false);

  const handleTooltipOpenChange = (open: boolean) => {
    if (!(open && restoringFocusRef.current)) setIsTooltipOpen(open);
  };

  // Radix hands focus back to a Dialog.Trigger, and this dialog has
  // none, so without this a keyboard user lands on the page top.
  const handleCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    restoringFocusRef.current = true;
    buttonRef.current?.focus();
    restoringFocusRef.current = false;
  };

  return { buttonRef, isTooltipOpen, handleTooltipOpenChange, handleCloseAutoFocus };
};

// Desktop, or inside a link: a tooltip on hover and on keyboard focus
const BadgeTooltip: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  description: string;
  children: React.ReactNode;
}> = ({ open, onOpenChange, name, description, children }) => (
  <TooltipProvider>
    <Tooltip open={open} onOpenChange={onOpenChange}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="font-semibold">{name}</div>
        <div className="text-gray-300 text-xs mt-1">{description}</div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
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
  const { buttonRef, isTooltipOpen, handleTooltipOpenChange, handleCloseAutoFocus } =
    useBadgeFocusRestore();

  const description = describeBadge(badge, config);
  const { opensDialog, showsTooltip } = getBadgeMode(interactive, isMobile);

  const badgeClassName = buildBadgeClassName({
    gradient: config.gradient,
    size,
    isMobile,
    isChampionship: isChampionshipType(badge.badge_type),
    opensDialog,
    className,
  });
  const badgeIcon = (
    <IconComponent className={cn('text-white', pickBySize(ICON_SIZES, size, isMobile))} />
  );

  // A real button, so Tab reaches it and Enter or Space opens the dialog.
  const badgeContent = opensDialog ? (
    <button
      ref={buttonRef}
      type="button"
      aria-label={config.name}
      aria-haspopup="dialog"
      onClick={() => setIsDialogOpen(true)}
      className={buildButtonClassName(badgeClassName, isMobile)}
    >
      {badgeIcon}
    </button>
  ) : (
    <div className={badgeClassName}>{badgeIcon}</div>
  );

  const dialog = opensDialog && (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <BadgeDialogBody
        gradient={config.gradient}
        IconComponent={IconComponent}
        name={config.name}
        description={description}
        onCloseAutoFocus={handleCloseAutoFocus}
      />
    </Dialog>
  );

  // On a phone button the dialog is the only detail view, so it gets no tooltip
  return (
    <>
      {showsTooltip ? (
        <BadgeTooltip
          open={isTooltipOpen}
          onOpenChange={handleTooltipOpenChange}
          name={config.name}
          description={description}
        >
          {badgeContent}
        </BadgeTooltip>
      ) : (
        badgeContent
      )}
      {dialog}
    </>
  );
};

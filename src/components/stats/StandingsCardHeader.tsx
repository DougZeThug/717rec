import { ChevronDown } from 'lucide-react';
import React from 'react';

import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

import {
  standingsDescriptionClasses,
  standingsHeaderClasses,
  standingsTitleClasses,
} from './fullRankingsStyles';
import { PowerScoreInfoPopover } from './PowerScoreInfoPopover';
import ViewToggle from './ViewToggle';

type StandingsTheme = { isWinterTheme: boolean; isLight: boolean };

interface StandingsCardHeaderProps {
  theme: StandingsTheme;
  isMobile: boolean;
  isOpen: boolean;
  view: 'division' | 'all';
  onViewChange: (view: 'division' | 'all') => void;
}

/** Stop a click on the view toggle from reaching the card behind it. */
const stopCardClick = (event: React.MouseEvent) => event.stopPropagation();

/** The heading, its Power Score explainer, and the line under them. */
const HeaderTitle: React.FC<{ theme: StandingsTheme; isMobile: boolean }> = ({
  theme,
  isMobile,
}) => (
  <div>
    <div className="flex items-center gap-1">
      <CardTitle
        className={cn(
          'font-bebas uppercase tracking-wide',
          isMobile ? 'text-lg' : 'text-xl sm:text-2xl',
          standingsTitleClasses(theme)
        )}
        style={{ letterSpacing: '0.5px' }}
      >
        Current Standings
      </CardTitle>
      {/* Outside the !isMobile guard below: the one-line description is
          desktop-only, so a phone had no explanation at all. */}
      <PowerScoreInfoPopover />
    </div>
    {!isMobile && (
      <CardDescription
        className={cn('line-clamp-2 font-inter', standingsDescriptionClasses(theme))}
      >
        Based on opponent-weighted win percentage, strength of schedule (SOS), and game-level
        performance
      </CardDescription>
    )}
  </div>
);

/** The controls on the right of the header: the view toggle and the chevron. */
const HeaderActions: React.FC<{
  theme: StandingsTheme;
  isMobile: boolean;
  isOpen: boolean;
  view: 'division' | 'all';
  onViewChange: (view: 'division' | 'all') => void;
}> = ({ theme, isMobile, isOpen, view, onViewChange }) => (
  <div className="flex items-center gap-2 ml-auto">
    {isOpen && !isMobile && (
      <div onClick={stopCardClick}>
        <ViewToggle view={view} onViewChange={onViewChange} />
      </div>
    )}
    <CollapsibleTrigger
      aria-label={isOpen ? 'Collapse current standings' : 'Expand current standings'}
      className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ChevronDown
        className={cn(
          'size-5 transition-transform',
          theme.isWinterTheme ? 'text-[hsl(var(--muted-foreground))]' : '',
          isOpen && 'rotate-180'
        )}
        aria-hidden="true"
      />
    </CollapsibleTrigger>
  </div>
);

/**
 * The standings card's title row. Split into title and actions to keep each
 * JSX tree shallow; the header is a plain container rather than the collapse
 * trigger because it holds a focusable control (ViewToggle), and nesting
 * focusable content inside a button-role element violates axe
 * no-focusable-content.
 */
export const StandingsCardHeader: React.FC<StandingsCardHeaderProps> = ({
  theme,
  isMobile,
  isOpen,
  view,
  onViewChange,
}) => (
  <CardHeader
    className={cn(
      isMobile ? 'py-2.5 px-3' : 'py-4',
      'rounded-t-lg transition-colors',
      standingsHeaderClasses(theme)
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <HeaderTitle theme={theme} isMobile={isMobile} />
      <HeaderActions
        theme={theme}
        isMobile={isMobile}
        isOpen={isOpen}
        view={view}
        onViewChange={onViewChange}
      />
    </div>
  </CardHeader>
);

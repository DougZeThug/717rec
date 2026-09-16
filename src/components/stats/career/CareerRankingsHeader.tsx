import { ChevronDown, Download, Trophy } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { CareerRanking } from '@/types/career';
import { exportCareerStatsToCSV } from '@/utils/exportUtils';

import {
  type CareerCardTheme,
  careerExportButtonClasses,
  careerHeaderClasses,
  careerHeaderPadding,
  careerTitleClasses,
} from './careerCardStyles';

interface CareerRankingsHeaderProps {
  theme: CareerCardTheme;
  isMobile: boolean;
  isOpen: boolean;
  rankings: CareerRanking[] | undefined;
}

/** The heading and the line under it, which only a wide screen gets. */
const HeaderTitle: React.FC<{ isMobile: boolean }> = ({ isMobile }) => (
  <div>
    <CardTitle className={cn(careerTitleClasses(isMobile))} style={{ letterSpacing: '0.5px' }}>
      Career Statistics
    </CardTitle>
    {!isMobile && (
      <CardDescription className="font-inter">
        Historical performance across all seasons and playoffs
      </CardDescription>
    )}
  </div>
);

/**
 * Export, and the chevron that opens the card.
 *
 * Export is offered only once the card is open and there is something to
 * export. It takes the rankings rather than a prepared callback because it
 * needs them twice: to decide whether to appear at all, and to write the file.
 */
const HeaderActions: React.FC<CareerRankingsHeaderProps> = ({ theme, isOpen, rankings }) => (
  <div className="flex items-center gap-3">
    {isOpen && rankings && rankings.length > 0 && (
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          // Defensive: the header is not the trigger today, so nothing sits
          // behind this to catch the click. Kept because that has been true
          // before and the cost of being wrong is a card that toggles shut
          // as the download starts.
          e.stopPropagation();
          exportCareerStatsToCSV(rankings);
        }}
        className={cn('h-8 px-3 gap-2', careerExportButtonClasses(theme))}
        title="Export to CSV"
      >
        <Download className="size-4" />
        <span className="sr-only sm:not-sr-only">Export</span>
      </Button>
    )}
    <CollapsibleTrigger
      aria-label={isOpen ? 'Collapse career statistics' : 'Expand career statistics'}
      className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ChevronDown
        className={cn('size-5 transition-transform', isOpen && 'rotate-180')}
        aria-hidden="true"
      />
    </CollapsibleTrigger>
  </div>
);

/**
 * The rankings card's header row.
 *
 * A plain container, not the collapsible trigger: only the chevron toggles.
 * The header cannot be the trigger because it holds a focusable control — the
 * Export button — and nesting focusable content inside a button-role element
 * fails axe's no-focusable-content rule.
 */
export const CareerRankingsHeader: React.FC<CareerRankingsHeaderProps> = (props) => (
  <CardHeader
    className={cn(
      careerHeaderPadding(props.isMobile),
      careerHeaderClasses(props.theme),
      'rounded-t-lg transition-colors'
    )}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Trophy className={cn('text-amber-500', props.isMobile ? 'size-4' : 'size-5')} />
        <HeaderTitle isMobile={props.isMobile} />
      </div>
      <HeaderActions {...props} />
    </div>
  </CardHeader>
);

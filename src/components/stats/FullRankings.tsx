import { ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import React, { useMemo, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/useMobile';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import { sortRankings } from '@/utils/rankingUtils';

import {
  standingsCardClasses,
  standingsContentClasses,
  standingsDescriptionClasses,
  standingsHeaderClasses,
  standingsTitleClasses,
} from './fullRankingsStyles';
import { PowerScoreInfoPopover } from './PowerScoreInfoPopover';
import RankingsTable from './RankingsTable';
import ViewToggle from './ViewToggle';

interface FullRankingsProps {
  rankings: Ranking[];
  myTeamId?: string | null;
}

const FullRankings: React.FC<FullRankingsProps> = ({ rankings, myTeamId }) => {
  const [view, setView] = useState<'division' | 'all'>('division');
  const [isOpen, setIsOpen] = useState(true); // Start uncollapsed
  const { resolvedTheme } = useTheme();
  const { isWinterTheme } = useSeasonalTheme();
  const isLight = resolvedTheme === 'light';
  const isMobile = useIsMobile();
  const theme = { isWinterTheme, isLight };

  // Sort rankings by power score for the unified view using the shared sorter so
  // tiebreakers (division tier, then win %, then name) are applied consistently.
  const sortedRankings = useMemo(
    () => (view === 'all' ? sortRankings(rankings, 'powerScore', 'desc') : rankings),
    [rankings, view]
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <Card
        className={cn(
          'border-t-2 shadow-lg hover:shadow-xl transition-shadow duration-300',
          ...standingsCardClasses(theme)
        )}
      >
        {/* Header is a plain container; only the chevron is the toggle button.
            The header can't be the trigger because it contains a focusable
            control (ViewToggle) — nesting focusable content in a button-role
            element violates axe no-focusable-content. */}
        <CardHeader
          className={cn(
            isMobile ? 'py-2.5 px-3' : 'py-4',
            'rounded-t-lg transition-colors',
            standingsHeaderClasses(theme)
          )}
        >
          <div className="flex items-center justify-between gap-2">
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
                {/* Outside the !isMobile guard below: the one-line description
                    is desktop-only, so a phone had no explanation at all. */}
                <PowerScoreInfoPopover />
              </div>
              {!isMobile && (
                <CardDescription
                  className={cn('line-clamp-2 font-inter', standingsDescriptionClasses(theme))}
                >
                  Based on opponent-weighted win percentage, strength of schedule (SOS), and
                  game-level performance
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {isOpen && !isMobile && (
                <div onClick={(e) => e.stopPropagation()}>
                  <ViewToggle view={view} onViewChange={setView} />
                </div>
              )}
              <CollapsibleTrigger
                aria-label={isOpen ? 'Collapse current standings' : 'Expand current standings'}
                className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronDown
                  className={cn(
                    'size-5 transition-transform',
                    isWinterTheme ? 'text-[hsl(var(--muted-foreground))]' : '',
                    isOpen && 'rotate-180'
                  )}
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent
            className={cn(isMobile ? 'p-1 pt-0.5' : 'p-2 sm:p-4', standingsContentClasses(theme))}
          >
            <RankingsTable
              rankings={sortedRankings}
              showUnified={view === 'all'}
              myTeamId={myTeamId}
              view={view}
              onViewChange={setView}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default FullRankings;

import { useTheme } from 'next-themes';
import React, { useMemo, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/useMobile';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import { sortRankings } from '@/utils/rankingUtils';

import { standingsCardClasses, standingsContentClasses } from './fullRankingsStyles';
import RankingsTable from './RankingsTable';
import { StandingsCardHeader } from './StandingsCardHeader';

interface FullRankingsProps {
  rankings: Ranking[];
  myTeamId?: string | null;
}

/** The table itself, behind the collapse. Kept apart so the card's tree stays shallow. */
const StandingsBody: React.FC<{
  theme: { isWinterTheme: boolean; isLight: boolean };
  isMobile: boolean;
  rankings: Ranking[];
  myTeamId?: string | null;
  view: 'division' | 'all';
  onViewChange: (view: 'division' | 'all') => void;
}> = ({ theme, isMobile, rankings, myTeamId, view, onViewChange }) => (
  <CollapsibleContent>
    <CardContent
      className={cn(isMobile ? 'p-1 pt-0.5' : 'p-2 sm:p-4', standingsContentClasses(theme))}
    >
      <RankingsTable
        rankings={rankings}
        showUnified={view === 'all'}
        myTeamId={myTeamId}
        view={view}
        onViewChange={onViewChange}
      />
    </CardContent>
  </CollapsibleContent>
);

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
        <StandingsCardHeader
          theme={theme}
          isMobile={isMobile}
          isOpen={isOpen}
          view={view}
          onViewChange={setView}
        />
        <StandingsBody
          theme={theme}
          isMobile={isMobile}
          rankings={sortedRankings}
          myTeamId={myTeamId}
          view={view}
          onViewChange={setView}
        />
      </Card>
    </Collapsible>
  );
};

export default FullRankings;

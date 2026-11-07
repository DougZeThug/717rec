import { AnimatePresence, m } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/useMobile';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { readOpen, writeOpen } from '@/utils/historyOpenState';

import HistoricalStandingsTable from './HistoricalStandingsTable';

interface SeasonData {
  team_id: string;
  season_id: string;
  match_wins: number;
  match_losses: number;
  game_wins: number;
  game_losses: number;
  sos: number | null;
  power_score: number | null;
  champion: boolean;
  runner_up: boolean;
  division_name: string | null;
  team_name: string;
  team_logo_url: string | null;
  team_image_url: string | null;
  playoff_rank: number | null;
}

interface DivisionPanelProps {
  seasonId: string;
  divisionName: string;
  teams: SeasonData[];
}

const DivisionTitle: React.FC<{
  divisionName: string;
  teamCount: number;
  isWinterTheme: boolean;
}> = ({ divisionName, teamCount, isWinterTheme }) => (
  <h4
    className={cn(
      'text-base md:text-lg font-semibold',
      isWinterTheme ? 'text-white' : 'text-foreground'
    )}
  >
    {divisionName}
    <span
      className={cn(
        'ml-2 text-base font-normal',
        isWinterTheme ? 'text-white/60' : 'text-muted-foreground'
      )}
    >
      ({teamCount})
    </span>
  </h4>
);

const DivisionPanel: React.FC<DivisionPanelProps> = ({ seasonId, divisionName, teams }) => {
  const isMobile = useIsMobile();
  // What this tab left open (Back from a team page, or a reload) wins. With nothing
  // remembered, start closed on a phone so the big team list is never drawn and then hidden.
  const openKey = `division:${seasonId}:${divisionName}`;
  const [isExpanded, setIsExpanded] = useState(() => readOpen(openKey) ?? !isMobile);
  const { isWinterTheme } = useSeasonalThemeBase();

  // Close the division when the screen BECOMES a phone (a wide window shrunk). Not on mount:
  // a division left open on a phone must stay open.
  const wasMobile = useRef(isMobile);
  useEffect(() => {
    if (isMobile && !wasMobile.current) {
      setIsExpanded(false);
      writeOpen(openKey, false);
    }
    wasMobile.current = isMobile;
  }, [isMobile, openKey]);

  const toggle = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    writeOpen(openKey, next);
  };

  // Sort teams by playoff_rank (1st, 2nd, 3rd, etc.) with fallback to match wins
  const sortedTeams = [...teams].sort((a, b) => {
    // If both teams have playoff ranks, sort by playoff rank (lower is better)
    if (a.playoff_rank !== null && b.playoff_rank !== null) {
      return a.playoff_rank - b.playoff_rank;
    }

    // If only one team has a playoff rank, it should come first
    if (a.playoff_rank !== null && b.playoff_rank === null) return -1;
    if (a.playoff_rank === null && b.playoff_rank !== null) return 1;

    // If neither has a playoff rank, fallback to sorting by match wins
    return b.match_wins - a.match_wins;
  });

  return (
    <div
      className={cn(
        'space-y-1.5 pb-3 last:border-b-0 md:space-y-3 md:pb-6',
        isWinterTheme ? 'md:border-b md:border-white/10' : 'md:border-b'
      )}
    >
      <div
        className={cn(
          'flex justify-between items-center cursor-pointer rounded-lg px-3 py-2 md:px-4 md:py-3 transition-colors',
          isWinterTheme
            ? 'bg-white/5 hover:bg-white/10 border border-white/10'
            : 'bg-muted/50 hover:bg-accent'
        )}
        onClick={toggle}
      >
        <div className="flex items-center gap-3">
          <DivisionTitle
            divisionName={divisionName}
            teamCount={teams.length}
            isWinterTheme={isWinterTheme}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="p-1 size-6 md:size-8 transition-transform duration-300"
          aria-expanded={isExpanded}
          aria-label={`Toggle ${divisionName} teams`}
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <ChevronDown size={20} />
        </Button>
      </div>

      {/* initial={false}: a division left open appears at full height, with no grow-in. */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <HistoricalStandingsTable teams={sortedTeams} />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DivisionPanel;

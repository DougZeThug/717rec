import { ArrowLeft } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { useIsMobile } from '@/hooks/useMobile';
import { useScrollBehavior } from '@/hooks/usePrefersReducedMotion';

import CorrectionsFilters, { ALL_SEASONS } from './CorrectionsFilters';
import { MatchCorrectionsPanel } from './MatchCorrectionsPanel';
import MatchSummaryCard from './MatchSummaryCard';
import { useCorrectionsFilters } from './useCorrectionsFilters';

/** Admin panel to browse live-scored matches by season and night, and correct one. */
const LiveCorrectionsSection: React.FC = () => {
  const filters = useCorrectionsFilters();
  const isMobile = useIsMobile();
  const scrollBehavior = useScrollBehavior();

  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const { chooseSeason } = filters;
  const handleSeasonChange = useCallback(
    (value: string) => {
      chooseSeason(value);
      // A match belongs to the season it was picked in.
      setSelectedMatchId(null);
    },
    [chooseSeason]
  );

  const handleSelectMatch = useCallback(
    (matchId: string) => {
      setSelectedMatchId(matchId);
      if (!isMobile) return;

      // On a phone the panel is below the whole list, so selecting a match used
      // to move nothing on screen. The panel mounts in this same tick, hence the
      // two frames before scrolling to it.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panelRef.current?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
        });
      });
    },
    [isMobile, scrollBehavior]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedMatchId(null);
    if (!isMobile) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    });
  }, [isMobile, scrollBehavior]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Live Score Corrections</h2>
        <p className="text-sm text-muted-foreground">
          Fix wrong round scores, bag breakdowns, throwers, or the winner of a completed game. Only
          matches scored live are listed here.
        </p>
      </div>

      <CorrectionsFilters
        seasons={filters.seasons}
        seasonId={filters.seasonId}
        onSeasonChange={handleSeasonChange}
        nights={filters.nights}
        night={filters.night}
        onNightChange={filters.chooseNight}
      />

      {filters.isLoading && (
        <LoadingState variant="section" message="Loading live-scored matches…" />
      )}
      {filters.error && (
        <p className="text-sm text-destructive" role="alert">
          Failed to load matches.
        </p>
      )}

      {/* Say what emptied the list. "No live-scored matches yet" is a claim about
          the league, and it was being made when a filter was the reason. */}
      {filters.loadedNothing && (
        <p className="text-sm text-muted-foreground">
          {filters.seasonId === ALL_SEASONS
            ? 'No live-scored matches yet.'
            : 'No live-scored matches in this season.'}
        </p>
      )}
      {filters.emptiedByNight && (
        <p className="text-sm text-muted-foreground">
          No live-scored matches on that night. Choose another night, or “All nights”.
        </p>
      )}

      {!filters.isLoading && (
        <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
          <div ref={listRef} className="space-y-2 scroll-mt-20">
            {filters.matches.map((match) => (
              <MatchSummaryCard
                key={match.id}
                match={match}
                isSelected={match.id === selectedMatchId}
                isArchivedSeason={Boolean(
                  match.season_id && filters.archivedSeasonIds.has(match.season_id)
                )}
                onSelect={handleSelectMatch}
              />
            ))}
          </div>

          <div ref={panelRef} className="space-y-2 scroll-mt-20">
            {selectedMatchId ? (
              <>
                {/* Beside the thing it clears, rather than a ghost button below
                    both columns. On a phone the list is off-screen by now, so it
                    is a way back to it; on a desktop the list never moved. */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleClearSelection}
                >
                  {isMobile ? (
                    <>
                      <ArrowLeft className="size-4" aria-hidden="true" />
                      Back to list
                    </>
                  ) : (
                    'Clear selection'
                  )}
                </Button>
                <MatchCorrectionsPanel matchId={selectedMatchId} />
              </>
            ) : (
              <div className="flex items-center justify-center min-h-[200px] rounded-md border border-dashed border-border">
                <p className="text-sm text-muted-foreground">
                  Select a match to view and correct its rounds.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveCorrectionsSection;

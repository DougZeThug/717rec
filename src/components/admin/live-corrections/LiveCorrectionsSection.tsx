import { ArrowLeft } from 'lucide-react';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { pickDefaultEntryDate } from '@/components/admin/mass-score-entry/utils/defaultEntryDate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminLiveScoredMatches } from '@/hooks/live-scoring/useAdminCorrections';
import { useIsMobile } from '@/hooks/useMobile';
import { useScrollBehavior } from '@/hooks/usePrefersReducedMotion';
import { useActiveSeason, useSeasons } from '@/hooks/useSeasons';
import { isMatchCompleted } from '@/utils/matchStatus';

import { formatLeagueNight, leagueNightKey, localDateKey } from './leagueNight';
import { MatchCorrectionsPanel } from './MatchCorrectionsPanel';

const ALL_SEASONS = '__all__';
const ALL_DATES = '__all__';

/** Admin panel to browse live-scored matches by season and open one for score corrections. */
const LiveCorrectionsSection: React.FC = () => {
  const { data: seasons } = useSeasons();
  const { data: activeSeason } = useActiveSeason();
  const isMobile = useIsMobile();
  const scrollBehavior = useScrollBehavior();

  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Null means "the admin has not chosen", so the defaults below apply. A-11:
  // league night is the job this section exists for, so it opens on the season
  // being played and the most recent night, not on every match ever scored.
  const [chosenSeasonId, setChosenSeasonId] = useState<string | null>(null);
  const [chosenNight, setChosenNight] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const seasonId = chosenSeasonId ?? activeSeason?.id ?? ALL_SEASONS;

  const {
    data: matches,
    isLoading,
    error,
  } = useAdminLiveScoredMatches(seasonId === ALL_SEASONS ? null : seasonId);

  // The nights on offer come from the matches actually loaded, so the default
  // can never land on a night with nothing on it — and the picker never lists
  // one either. Most recent first, matching the list's own order.
  const nights = useMemo(() => {
    const keys = new Set<string>();
    for (const match of matches ?? []) {
      const key = leagueNightKey(match.date);
      if (key) keys.add(key);
    }
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [matches]);

  const defaultNight = useMemo(() => {
    const chosen = pickDefaultEntryDate(matches ?? []);
    return chosen ? localDateKey(chosen) : ALL_DATES;
  }, [matches]);

  const night = chosenNight ?? defaultNight;

  const visibleMatches = useMemo(() => {
    if (night === ALL_DATES) return matches ?? [];
    return (matches ?? []).filter((match) => leagueNightKey(match.date) === night);
  }, [matches, night]);

  // B-20: archived seasons are frozen. They stay listed and readable — the panel
  // refuses the edits — but say so before the admin picks one, and on every card,
  // because "All seasons" mixes them in without anyone choosing them.
  const archivedSeasonIds = useMemo(() => {
    const ids = new Set<string>();
    for (const season of seasons ?? []) {
      if (season.is_archived) ids.add(season.id);
    }
    return ids;
  }, [seasons]);

  const handleSeasonChange = useCallback((value: string) => {
    setChosenSeasonId(value);
    // A night and a match both belong to the season they were picked in.
    setChosenNight(null);
    setSelectedMatchId(null);
  }, []);

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

  const noMatchesAtAll = !isLoading && !error && (matches?.length ?? 0) === 0;
  const emptiedByNight = !isLoading && !error && !noMatchesAtAll && visibleMatches.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Live Score Corrections</h2>
        <p className="text-sm text-muted-foreground">
          Fix wrong round scores, bag breakdowns, throwers, or the winner of a completed game. Only
          matches scored live are listed here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="season-filter" className="text-sm font-medium">
          Season
        </label>
        <Select value={seasonId} onValueChange={handleSeasonChange}>
          <SelectTrigger id="season-filter" className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SEASONS}>All seasons</SelectItem>
            {(seasons ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.is_archived ? `${s.name} (archived — read-only)` : s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label htmlFor="night-filter" className="text-sm font-medium">
          Night
        </label>
        <Select value={night} onValueChange={setChosenNight}>
          <SelectTrigger id="night-filter" className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DATES}>All nights</SelectItem>
            {nights.map((key) => (
              <SelectItem key={key} value={key}>
                {formatLeagueNight(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState variant="section" message="Loading live-scored matches…" />}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          Failed to load matches.
        </p>
      )}

      {noMatchesAtAll && (
        <p className="text-sm text-muted-foreground">
          {seasonId === ALL_SEASONS
            ? 'No live-scored matches yet.'
            : 'No live-scored matches in this season.'}
        </p>
      )}
      {emptiedByNight && (
        <p className="text-sm text-muted-foreground">
          No live-scored matches on that night. Choose another night, or “All nights”.
        </p>
      )}

      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
          <div ref={listRef} className="space-y-2 scroll-mt-20">
            {visibleMatches.map((m) => {
              const active = m.id === selectedMatchId;
              return (
                <Card
                  key={m.id}
                  className={
                    active
                      ? 'border-primary ring-1 ring-primary/40 cursor-pointer'
                      : 'cursor-pointer hover:border-primary/40'
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSelectMatch(m.id)}
                    className="w-full text-left"
                    aria-pressed={active}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        {m.team1?.name ?? 'Team 1'} vs {m.team2?.name ?? 'Team 2'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground space-y-0.5">
                      <div>
                        {leagueNightKey(m.date)
                          ? formatLeagueNight(leagueNightKey(m.date) as string)
                          : 'No date'}
                      </div>
                      <div>
                        {m.gameCount} game{m.gameCount === 1 ? '' : 's'} · {m.roundCount} round
                        {m.roundCount === 1 ? '' : 's'}
                        {isMatchCompleted(m) ? ' · final' : ''}
                        {m.season_id && archivedSeasonIds.has(m.season_id)
                          ? ' · archived, read-only'
                          : ''}
                      </div>
                    </CardContent>
                  </button>
                </Card>
              );
            })}
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

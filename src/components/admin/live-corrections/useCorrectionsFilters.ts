import { useCallback, useMemo, useState } from 'react';

import { pickDefaultEntryDate } from '@/components/admin/mass-score-entry/utils/defaultEntryDate';
import { useAdminLiveScoredMatches } from '@/hooks/live-scoring/useAdminCorrections';
import { useActiveSeason, useSeasons } from '@/hooks/useSeasons';

import { ALL_DATES, ALL_SEASONS } from './CorrectionsFilters';
import { leagueNightKey, localDateKey } from './leagueNight';

/**
 * Which live-scored matches the corrections list is showing, and why.
 *
 * A-11: league night is the job this section exists for, so it opens on the
 * season being played and the most recent night with matches rather than on
 * every match ever scored.
 *
 * The night is filtered here rather than in the query. Only the season reaches
 * the service, so `useAdminLiveScoredMatches`, its query key and
 * `AdminCorrectionsService` are all untouched by the night picker.
 */
export const useCorrectionsFilters = () => {
  const { data: seasons } = useSeasons();
  const { data: activeSeason } = useActiveSeason();

  // Null means "the admin has not chosen", so the defaults below apply.
  const [chosenSeasonId, setChosenSeasonId] = useState<string | null>(null);
  const [chosenNight, setChosenNight] = useState<string | null>(null);

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
  // refuses the edits — but say so on every card, because "All seasons" mixes
  // them in without anyone choosing them.
  const archivedSeasonIds = useMemo(() => {
    const ids = new Set<string>();
    for (const season of seasons ?? []) {
      if (season.is_archived) ids.add(season.id);
    }
    return ids;
  }, [seasons]);

  const settled = !isLoading && !error;
  const loadedNothing = settled && (matches?.length ?? 0) === 0;

  return {
    seasons: seasons ?? [],
    seasonId,
    night,
    nights,
    matches: visibleMatches,
    archivedSeasonIds,
    isLoading,
    error,
    /** The season holds no live-scored matches at all. */
    loadedNothing,
    /** Matches exist for the season, but the chosen night has none of them. */
    emptiedByNight: settled && !loadedNothing && visibleMatches.length === 0,
    chooseSeason: useCallback((value: string) => {
      setChosenSeasonId(value);
      // A night belongs to the season it was picked in.
      setChosenNight(null);
    }, []),
    chooseNight: setChosenNight,
  };
};

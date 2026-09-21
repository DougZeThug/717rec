import { useQuery } from '@tanstack/react-query';

import { useActiveSeason } from '@/hooks/useSeasons';
import { UnsavedLiveMatchesService } from '@/services/admin/UnsavedLiveMatchesService';

/**
 * Matches in the **active season** that live scoring decided but nobody saved.
 *
 * Scoped to the active season on purpose. `archive_season` archives and deletes
 * only completed matches and then zeroes every team's counters, so a
 * decided-but-unsaved match from an archived season stays in `matches`
 * indefinitely. Listing one would invite an admin to save it, and
 * `finalize_live_match` would add that old result to the current season's team
 * records — the very corruption this card exists to prevent.
 */
/** Invalidate this after anything that can save or reverse a live match's result. */
export const UNSAVED_LIVE_MATCHES_KEY = ['admin', 'unsaved-live-matches'] as const;

export const useUnsavedLiveMatches = () => {
  const { data: activeSeason, isLoading: isSeasonLoading } = useActiveSeason();
  const seasonId = activeSeason?.id;

  const query = useQuery({
    queryKey: [...UNSAVED_LIVE_MATCHES_KEY, seasonId ?? ''],
    queryFn: () => {
      if (!seasonId) throw new Error('An active season is required');
      return UnsavedLiveMatchesService.fetchUnsavedLiveMatches(seasonId);
    },
    enabled: Boolean(seasonId),
    staleTime: 60_000,
  });

  return {
    matches: query.data ?? [],
    isLoading: isSeasonLoading || query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    hasActiveSeason: Boolean(seasonId),
  };
};

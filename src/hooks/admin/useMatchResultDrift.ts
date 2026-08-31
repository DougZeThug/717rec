import { useQuery } from '@tanstack/react-query';

import { useActiveSeason } from '@/hooks/useSeasons';
import { MatchResultDriftService } from '@/services/admin/MatchResultDriftService';

/** Invalidate this after anything that can change whether a match agrees with itself. */
export const MATCH_RESULT_DRIFT_KEY = ['admin', 'match-result-drift'] as const;

/**
 * Matches in the **active season** whose recorded result, or whose stored game
 * rows, no longer agree with the rounds underneath them (B-19).
 *
 * Scoped to the active season on purpose, for the same reason
 * `useUnsavedLiveMatches` is. The fix for a row here is to reopen the match and
 * save the result again, and `finalize_live_match` increments the `teams`
 * counters with no season filter, so listing an archived season's match would
 * invite an admin to add an old result to the current standings.
 */
export const useMatchResultDrift = () => {
  const seasonQuery = useActiveSeason();
  const seasonId = seasonQuery.data?.id;

  const query = useQuery({
    queryKey: [...MATCH_RESULT_DRIFT_KEY, seasonId ?? ''],
    queryFn: () => {
      if (!seasonId) throw new Error('An active season is required');
      return MatchResultDriftService.fetchMatchResultDrift(seasonId);
    },
    enabled: Boolean(seasonId),
    staleTime: 60_000,
  });

  return {
    matches: query.data ?? [],
    isLoading: seasonQuery.isLoading || query.isLoading,
    // A failed season read must not read as "no active season". Without this the
    // drift query stays disabled, so its own isError is false, and the card
    // would tell the admin the league has no active season when in truth the
    // season could not be read at all. fetchActiveSeason also throws when two
    // seasons are active, which is worth surfacing rather than swallowing.
    isError: seasonQuery.isError || query.isError,
    // The season first: when it is what failed, the drift query is disabled and
    // refetching it alone does nothing, which would leave Retry dead.
    refetch: async () => {
      const season = await seasonQuery.refetch();
      if (season.data?.id) await query.refetch();
    },
    hasActiveSeason: Boolean(seasonId),
  };
};

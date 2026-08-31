import { useQuery } from '@tanstack/react-query';

import { useActiveSeason } from '@/hooks/useSeasons';
import { MatchResultDriftService } from '@/services/admin/MatchResultDriftService';

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
  const { data: activeSeason, isLoading: isSeasonLoading } = useActiveSeason();
  const seasonId = activeSeason?.id;

  const query = useQuery({
    queryKey: ['admin', 'match-result-drift', seasonId ?? ''],
    queryFn: () => {
      if (!seasonId) throw new Error('An active season is required');
      return MatchResultDriftService.fetchMatchResultDrift(seasonId);
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

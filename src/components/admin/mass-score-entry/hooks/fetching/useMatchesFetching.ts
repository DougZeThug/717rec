import { useToast } from '@/hooks/useToast';
import { fetchMatchesForAdmin } from '@/services/matches/MatchReadService';
import { errorLog } from '@/utils/logger';

import { FilterState, MatchWithTeams } from '../../types';
import { transformDatabaseMatchToMatchWithTeams } from '../../utils/matchTransformUtils';

export const useMatchesFetching = () => {
  const { toast } = useToast();

  // Throwing variant for TanStack queryFn use: failures propagate to the
  // query's error state so the tool can render a retryable error instead of
  // an empty list that looks like "no matches".
  const fetchMatchesOrThrow = async (filters: FilterState) => {
    const data = await fetchMatchesForAdmin(filters);
    return data.map(transformDatabaseMatchToMatchWithTeams) as MatchWithTeams[];
  };

  // Swallowing variant kept for the post-submission refresh, where an empty
  // result must not blank the just-submitted list (see handleSubmitAll).
  const fetchMatches = async (filters: FilterState) => {
    try {
      return await fetchMatchesOrThrow(filters);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error fetching matches:', message);
      toast({
        title: 'Error',
        description: `Failed to fetch matches: ${message}`,
        variant: 'destructive',
      });
      return [];
    }
  };

  return { fetchMatches, fetchMatchesOrThrow };
};

import { useToast } from '@/hooks/useToast';
import { fetchMatchesForAdmin } from '@/services/matches/MatchReadService';
import { errorLog } from '@/utils/logger';

import { FilterState, MatchWithTeams } from '../../types';
import { transformDatabaseMatchToMatchWithTeams } from '../../utils/matchTransformUtils';

export const useMatchesFetching = () => {
  const { toast } = useToast();

  const fetchMatches = async (filters: FilterState) => {
    try {
      const data = await fetchMatchesForAdmin(filters);
      return data.map(transformDatabaseMatchToMatchWithTeams) as MatchWithTeams[];
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

  return { fetchMatches };
};

import { useQuery } from '@tanstack/react-query';

import { TEAMS_QUERY_KEY } from '@/hooks/teams';
import { fetchPlayoffTeams } from '@/services/brackets/BracketReadService';
import type { Team } from '@/utils/playoffs/playoffTypes';

/**
 * Hook for fetching playoff teams with seed information
 */
export const usePlayoffTeams = () => {
  return useQuery({
    queryKey: [TEAMS_QUERY_KEY, 'with-seeds'],
    queryFn: (): Promise<Team[]> => fetchPlayoffTeams(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

import { useQuery } from '@tanstack/react-query';

import { TEAMS_QUERY_KEY, useTeamsQuery } from '@/hooks/teams';
import { fetchPlayoffTeams } from '@/services/brackets/BracketReadService';
import type { Team } from '@/utils/playoffs/playoffTypes';

/**
 * Hook for fetching playoff teams with seed information
 * Uses useTeamsQuery internally but adds seed data from teams table
 */
export const usePlayoffTeams = () => {
  // Base teams query for cache sharing
  const baseQuery = useTeamsQuery();

  return useQuery({
    queryKey: [TEAMS_QUERY_KEY, 'with-seeds'],
    queryFn: (): Promise<Team[]> => fetchPlayoffTeams(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

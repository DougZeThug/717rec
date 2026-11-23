import { useQuery } from '@tanstack/react-query';

import { fetchSeasonBreakdown } from '@/services/TeamSeasonStatsService';

export const useTeamSeasonBreakdown = (teamId: string | undefined) => {
  const {
    data: advancedStats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['team-season-breakdown', teamId],
    queryFn: () => (teamId ? fetchSeasonBreakdown(teamId) : Promise.resolve(null)),
    enabled: Boolean(teamId),
    staleTime: 5 * 60 * 1000,
  });

  return { advancedStats, isLoading, error, refetch };
};

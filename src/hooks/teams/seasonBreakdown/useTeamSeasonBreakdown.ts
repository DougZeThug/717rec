import { useQuery } from '@tanstack/react-query';
import { fetchTeamSeasonBreakdown } from './fetchTeamSeasonBreakdown';

export const useTeamSeasonBreakdown = (teamId: string | undefined) => {
  const { data: advancedStats, isLoading, error } = useQuery({
    queryKey: ['team-season-breakdown', teamId],
    queryFn: () => fetchTeamSeasonBreakdown(teamId!),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });

  return { advancedStats, isLoading, error };
};

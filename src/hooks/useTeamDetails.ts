import { useQuery } from '@tanstack/react-query';

import { fetchTeamDetails } from '@/services/teams/TeamFetchService';

export const useTeamDetails = (teamId: string | undefined) => {
  const teamQuery = useQuery({
    queryKey: ['team-details', teamId],
    queryFn: () => (teamId ? fetchTeamDetails(teamId) : Promise.resolve(null)),
    enabled: !!teamId,
  });

  return {
    team: teamQuery.data,
    isLoading: teamQuery.isLoading,
  };
};

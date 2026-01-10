import { useQuery } from '@tanstack/react-query';

import { fetchTeamData } from '@/utils/teamStatsUtils/fetchTeamData';

export const useTeamGameStats = (teamId?: string) => {
  return useQuery({
    queryKey: ['team-game-stats', teamId],
    queryFn: async () => {
      if (!teamId) return null;
      return fetchTeamData(teamId);
    },
    enabled: !!teamId,
  });
};

import { useQuery } from '@tanstack/react-query';

import { fetchTeamCareerPowerScore } from '@/services/rankings/RankingCareerService';

export const useTeamCareerPowerScore = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-career-power-score', teamId],
    queryFn: () => {
      if (!teamId) throw new Error('Team ID is required');
      return fetchTeamCareerPowerScore(teamId);
    },
    enabled: !!teamId,
  });
};

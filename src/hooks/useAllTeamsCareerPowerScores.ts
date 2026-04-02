import { useQuery } from '@tanstack/react-query';

import { fetchAllTeamsCareerPowerScores } from '@/services/rankings/RankingCareerService';

export interface TeamCareerData {
  teamId: string;
  teamName: string;
  divisionName: string | null;
  seasonData: Array<{
    seasonName: string;
    powerScore: number | null;
    seasonOrder: number;
  }>;
}

export const useAllTeamsCareerPowerScores = () => {
  return useQuery<TeamCareerData[]>({
    queryKey: ['all-teams-career-power-scores'],
    queryFn: fetchAllTeamsCareerPowerScores,
    staleTime: 60000,
  });
};

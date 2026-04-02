import { useQuery } from '@tanstack/react-query';

import { fetchHistoricalPowerScores } from '@/services/rankings/RankingCareerService';

type PowerScoreHistory = {
  team_id: string;
  power_scores: { date: string; score: number }[];
};

/**
 * Hook to fetch historical power scores for a team or teams
 */
export const useHistoricalPowerScores = (teamId?: string) => {
  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['historical-power-scores', teamId ?? 'all'],
    queryFn: () => fetchHistoricalPowerScores(teamId),
    staleTime: 1000 * 60 * 10, // 10 minutes - historical data is stable
  });

  return {
    historicalScores: data?.historicalScores ?? ([] as PowerScoreHistory[]),
    previousScores: data?.previousScores ?? ({} as Record<string, number>),
    loading,
    error: error ?? null,
  };
};

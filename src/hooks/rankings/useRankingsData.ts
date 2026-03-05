import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchRankingsData } from '@/services/RankingsCalculationService';

export const useRankingsData = () => {
  const queryClient = useQueryClient();

  const {
    data: latestMatches,
    isLoading: matchesLoading,
    error,
  } = useQuery({
    queryKey: ['matches', 'rankings'],
    queryFn: fetchRankingsData,
    staleTime: 1000 * 60 * 3, // 3 minutes - rankings only update after match completions
  });

  return {
    latestMatches,
    matchesLoading,
    matchesError: error as Error | null,
  };
};

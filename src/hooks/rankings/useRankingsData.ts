import { useQuery } from '@tanstack/react-query';

import { fetchRankingsData } from '@/services/RankingsCalculationService';
import { liveRefetchInterval } from '@/utils/leagueNight';

export const useRankingsData = () => {
  const {
    data: latestMatches,
    isLoading: matchesLoading,
    error,
    refetch,
    dataUpdatedAt,
    isFetching,
  } = useQuery({
    queryKey: ['matches', 'rankings'],
    queryFn: fetchRankingsData,
    staleTime: 1000 * 60 * 3, // 3 minutes - rankings only update after match completions
    refetchInterval: liveRefetchInterval, // every minute on league night only
  });

  return {
    latestMatches,
    matchesLoading,
    matchesError: error as Error | null,
    refetchMatches: refetch,
    matchesUpdatedAt: dataUpdatedAt,
    matchesFetching: isFetching,
  };
};

import { useQuery } from '@tanstack/react-query';

import { fetchPowerScoreTrends } from '@/services/rankings/RankingTrendsService';
import { TrendDirection } from '@/types/powerScoreTrends';

export const usePowerScoreTrends = (direction: TrendDirection = 'up', limit: number = 10) => {
  return useQuery({
    queryKey: ['power-score-trends', direction, limit],
    queryFn: () => fetchPowerScoreTrends(direction, limit),
    staleTime: 60000, // Cache for 1 minute
  });
};

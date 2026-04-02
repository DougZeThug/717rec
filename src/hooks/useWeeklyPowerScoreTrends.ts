import { useQuery } from '@tanstack/react-query';

import { fetchWeeklyPowerScoreTrends } from '@/services/rankings/RankingTrendsService';
import { TrendDirection } from '@/types/powerScoreTrends';

export const useWeeklyPowerScoreTrends = (direction: TrendDirection = 'up', limit: number = 10) => {
  return useQuery({
    queryKey: ['weekly-power-score-trends', direction, limit],
    queryFn: () => fetchWeeklyPowerScoreTrends(direction, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes - trends don't change frequently
  });
};

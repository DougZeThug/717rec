import { useQuery } from '@tanstack/react-query';

import { TrafficService } from '@/services/traffic/TrafficService';

export const useDailyTraffic = (days = 30) =>
  useQuery({
    queryKey: ['ops-health', 'daily-traffic', days],
    queryFn: () => TrafficService.fetchDailyTraffic(days),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
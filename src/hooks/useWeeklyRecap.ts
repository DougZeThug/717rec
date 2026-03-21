import { useQuery } from '@tanstack/react-query';

import { WeeklyRecapService } from '@/services/WeeklyRecapService';

export const useWeeklyRecap = () => {
  return useQuery({
    queryKey: ['weekly-recap'],
    queryFn: () => WeeklyRecapService.fetchWeeklyRecap(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

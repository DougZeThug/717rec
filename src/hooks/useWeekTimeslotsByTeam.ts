import { useQuery } from '@tanstack/react-query';

import { TimeslotQueryService } from '@/services/timeslots/TimeslotQueryService';

export const useWeekTimeslotsByTeam = (teamId: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['week-timeslots', teamId, startDate, endDate],
    queryFn: () => TimeslotQueryService.fetchWeekTimeslotsByTeam(teamId, startDate, endDate),
    enabled: !!teamId && !!startDate && !!endDate,
    staleTime: 60_000,
  });
};

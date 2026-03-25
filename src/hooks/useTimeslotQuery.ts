import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TimeslotTransformer } from '@/services/timeslots/TimeslotTransformer';
import { TimeslotGroup } from '@/types/timeslots';

export const useTimeslotQuery = (date: Date | null) => {
  const query = useQuery({
    queryKey: ['timeslots', date ? format(date, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!date) {
        return { timeslots: [], groupedTimeslots: {} as TimeslotGroup };
      }

      const formattedData = await TimeslotService.fetchByDate(date);
      const grouped = TimeslotTransformer.groupByTimeslot(formattedData);

      return {
        timeslots: formattedData,
        groupedTimeslots: grouped,
      };
    },
    enabled: !!date,
    staleTime: 60_000,
    refetchInterval: () => {
      if (typeof document !== 'undefined' && document.hidden) return false;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
      return 60_000;
    },
    placeholderData: (prev) => prev,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });

  return {
    timeslots: query.data?.timeslots || [],
    groupedTimeslots: query.data?.groupedTimeslots || {},
    isLoading: query.isLoading,
    error: query.error?.message || null,
  };
};

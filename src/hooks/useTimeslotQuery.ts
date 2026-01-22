import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TimeslotTransformer } from '@/services/timeslots/TimeslotTransformer';
import { TeamTimeslot, TimeslotGroup } from '@/types/timeslots';

export const useTimeslotQuery = (date: Date | null) => {
  const query = useQuery({
    queryKey: ['timeslots', date ? format(date, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!date) {
        return { timeslots: [], groupedTimeslots: {} };
      }

      const result = await TimeslotService.fetchByDate(date);

      if (!result.success) {
        throw new Error(result.error || 'Failed to load timeslots');
      }

      const formattedData = result.data as TeamTimeslot[];
      const grouped = TimeslotTransformer.groupByTimeslot(formattedData);

      return {
        timeslots: formattedData,
        groupedTimeslots: grouped,
      };
    },
    enabled: !!date,
    staleTime: 0, // Always fresh - instant updates
    refetchInterval: 30000, // Auto-refetch every 30 seconds
  });

  return {
    timeslots: query.data?.timeslots || [],
    groupedTimeslots: query.data?.groupedTimeslots || {},
    isLoading: query.isLoading,
    error: query.error?.message || null,
  };
};

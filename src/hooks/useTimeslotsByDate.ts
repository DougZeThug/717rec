import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TimeslotTransformer } from '@/services/timeslots/TimeslotTransformer';
import { TeamTimeslot } from '@/types';

export const useTimeslotsByDate = (date: Date | null) => {
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : null;

  const { data: timeslots = [], isLoading } = useQuery<TeamTimeslot[]>({
    queryKey: ['timeslots', formattedDate],
    queryFn: async () => {
      if (!formattedDate) return [];

      const data = await TimeslotService.fetchTimeslotsByDate(formattedDate);

      // Normalize raw rows to the TeamTimeslot type
      return TimeslotTransformer.formatTimeslotResponse(data);
    },
    enabled: !!date,
    staleTime: 0, // Always fresh - instant updates
  });

  return { timeslots, isLoading };
};

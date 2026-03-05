import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TeamTimeslot } from '@/types';

export const useTimeslotsByDate = (date: Date | null) => {
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : null;

  const { data: timeslots = [], isLoading } = useQuery<TeamTimeslot[]>({
    queryKey: ['timeslots', formattedDate],
    queryFn: async () => {
      if (!formattedDate) return [];

      const data = await TimeslotService.fetchTimeslotsByDate(formattedDate);

      // Map the data to match the TeamTimeslot type
      const formattedData: TeamTimeslot[] =
        data?.map((item) => ({
          ...item,
          is_double_header: item.is_double_header || false,
          teams: item.teams
            ? {
                id: item.teams.id,
                name: item.teams.name,
                logo_url: item.teams.logo_url,
                image_url: item.teams.image_url,
                divisionName: null,
              }
            : undefined,
        })) || [];

      return formattedData;
    },
    enabled: !!date,
    staleTime: 0, // Always fresh - instant updates
  });

  return { timeslots, isLoading };
};

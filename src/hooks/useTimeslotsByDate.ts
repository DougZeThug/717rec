import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { supabase } from '@/integrations/supabase/client';
import { TeamTimeslot } from '@/types';
import { errorLog } from '@/utils/logger';

export const useTimeslotsByDate = (date: Date | null) => {
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : null;

  const { data: timeslots = [], isLoading } = useQuery<TeamTimeslot[]>({
    queryKey: ['timeslots', formattedDate],
    queryFn: async () => {
      if (!formattedDate) return [];

      // Use explicit foreign key join for the teams relation
      const { data, error } = await supabase
        .from('team_timeslots')
        .select(
          `
          id,
          match_date,
          timeslot,
          team_id,
          created_at,
          is_back_to_back,
          pair_slot,
          match_sequence,
          teams:team_id (
            id, 
            name, 
            logo_url,
            image_url
          )
        `
        )
        .eq('match_date', formattedDate);

      if (error) {
        errorLog('Error fetching timeslots:', error);
        throw error;
      }

      // Map the data to match the TeamTimeslot type
      const formattedData: TeamTimeslot[] =
        data?.map((item) => ({
          ...item,
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
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return { timeslots, isLoading };
};

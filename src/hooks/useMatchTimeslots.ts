import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { supabase } from '@/integrations/supabase/client';
import { TeamTimeslot } from '@/types';
import { errorLog, scheduleLog } from '@/utils/logger';

// Filter function to show only primary timeslots for each team
const filterToPrimaryTimeslots = (data: TeamTimeslot[]): TeamTimeslot[] => {
  return data.filter((timeslot) => {
    // Include legacy single timeslots (not back-to-back)
    if (!timeslot.is_back_to_back) return true;

    // For back-to-back, only include the primary slot (sequence 1)
    return timeslot.match_sequence === 1;
  });
};

export const useMatchTimeslots = (date: Date | null) => {
  const query = useQuery({
    queryKey: ['match-timeslots', date ? format(date, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!date) {
        return { timeslots: [], groupedTimeslots: {} };
      }

      const formattedDate = format(date, 'yyyy-MM-dd');
      scheduleLog('Fetching timeslots for date:', formattedDate);

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
          is_double_header,
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
        throw new Error('Failed to load timeslots');
      }

      scheduleLog('Timeslots raw data:', data);

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

      scheduleLog('Formatted timeslots data:', formattedData);

      // Filter to show only primary timeslots
      const filteredData = filterToPrimaryTimeslots(formattedData);
      scheduleLog('Filtered timeslots (primary only):', filteredData);

      // Group timeslots by timeslot value
      const grouped = filteredData.reduce((acc: Record<string, TeamTimeslot[]>, curr) => {
        if (!curr.timeslot) return acc;

        if (!acc[curr.timeslot]) {
          acc[curr.timeslot] = [];
        }

        acc[curr.timeslot].push(curr);
        return acc;
      }, {});

      // Sort the timeslots object by keys (time values)
      const sortedGrouped = Object.keys(grouped)
        .sort()
        .reduce((acc: Record<string, TeamTimeslot[]>, key) => {
          acc[key] = grouped[key];
          return acc;
        }, {});

      scheduleLog('Grouped timeslots:', sortedGrouped);

      return {
        timeslots: filteredData,
        groupedTimeslots: sortedGrouped,
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

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { TeamTimeslot } from '@/types';
import { errorLog, scheduleLog } from '@/utils/logger';

export const useMatchTimeslots = (date: Date | null) => {
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedTimeslots, setGroupedTimeslots] = useState<Record<string, TeamTimeslot[]>>({});
  const queryClient = useQueryClient();

  // Filter function to show only primary timeslots for each team
  const filterToPrimaryTimeslots = (data: TeamTimeslot[]): TeamTimeslot[] => {
    return data.filter((timeslot) => {
      // Include legacy single timeslots (not back-to-back)
      if (!timeslot.is_back_to_back) return true;

      // For back-to-back, only include the primary slot (sequence 1)
      return timeslot.match_sequence === 1;
    });
  };

  useEffect(() => {
    const loadTimeslots = async () => {
      if (!date) {
        setTimeslots([]);
        setGroupedTimeslots({});
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Format date as YYYY-MM-DD for database queries
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
          throw error;
        }

        // Log for debugging
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

        setTimeslots(filteredData);

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
        setGroupedTimeslots(sortedGrouped);
      } catch (err) {
        errorLog('Error fetching timeslots:', err);
        setError('Failed to load timeslots');
      } finally {
        setIsLoading(false);
      }
    };

    loadTimeslots();
  }, [date]);

  // Add a 30-second polling mechanism to refresh timeslots
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (date) {
        queryClient.invalidateQueries({ queryKey: ['timeslots', format(date, 'yyyy-MM-dd')] });
        // Re-run the loadTimeslots logic
        const formattedDate = format(date, 'yyyy-MM-dd');

        supabase
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
          .eq('match_date', formattedDate)
          .then(({ data, error }) => {
            if (error) {
              errorLog('Error refreshing timeslots:', error);
              return;
            }

            // Map and filter the data
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

            // Filter to show only primary timeslots
            const filteredData = filterToPrimaryTimeslots(formattedData);

            setTimeslots(filteredData);

            // Group timeslots
            const grouped = filteredData.reduce((acc: Record<string, TeamTimeslot[]>, curr) => {
              if (!curr.timeslot) return acc;

              if (!acc[curr.timeslot]) {
                acc[curr.timeslot] = [];
              }

              acc[curr.timeslot].push(curr);
              return acc;
            }, {});

            // Sort the timeslots
            const sortedGrouped = Object.keys(grouped)
              .sort()
              .reduce((acc: Record<string, TeamTimeslot[]>, key) => {
                acc[key] = grouped[key];
                return acc;
              }, {});

            setGroupedTimeslots(sortedGrouped);
          });
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [date, queryClient]);

  return { timeslots, groupedTimeslots, isLoading, error };
};

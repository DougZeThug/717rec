import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { fetchMatchTimeslots } from '@/services/matches/MatchReadService';
import { TeamTimeslot } from '@/types';
import { scheduleLog } from '@/utils/logger';

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

      const rawData = await fetchMatchTimeslots(formattedDate);

      scheduleLog('Timeslots raw data:', rawData);

      // Map the data to match the TeamTimeslot type
      const formattedData: TeamTimeslot[] =
        rawData?.map((item) => ({
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
    staleTime: 30_000, // 30s — data is fresh for the polling interval
    refetchInterval: () => {
      // Pause polling when the tab is hidden or the device is offline
      if (typeof document !== 'undefined' && document.hidden) return false;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
      return 30_000;
    },
    // Keep previous data while refetching so the UI never goes blank
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

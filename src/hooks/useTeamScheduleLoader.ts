import { useCallback, useState } from 'react';

import { getAllBackToBackTeams } from '@/services/timeslots/teamLoaderUtils';
import { TimeBlockTeamsMap } from '@/types/autoSchedule';
import { normalizeDate } from '@/utils/dateNormalization';
import { errorLog, scheduleLog } from '@/utils/logger';

/**
 * Hook for loading team schedules and handling team count status
 * - Enhanced with improved date handling and error detection
 */
export const useTeamScheduleLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [timeBlockTeams, setTimeBlockTeams] = useState<TimeBlockTeamsMap>({});

  /**
   * Load teams for all time blocks for a specific date
   * Improved date handling and error detection
   */
  const loadTeamsForDate = useCallback(async (date: Date): Promise<TimeBlockTeamsMap> => {
    setIsLoading(true);

    try {
      scheduleLog('loadTeamsForDate called with:', {
        date,
        normalizedDate: normalizeDate(date, 'loadTeamsForDate'),
      });

      // Ensure the date is properly formatted to prevent timezone issues
      const safeDate = new Date(date);
      safeDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone edge cases

      // Use the new back-to-back team loading function
      const timeBlocksData = await getAllBackToBackTeams(safeDate);

      // Update state with standard time block format
      setTimeBlockTeams(timeBlocksData);

      scheduleLog('Team loading completed', {
        timeBlockCount: Object.keys(timeBlocksData).length,
        totalTeams: Object.values(timeBlocksData).flat().length,
      });

      // Return standard time blocks
      return timeBlocksData;
    } catch (error) {
      errorLog('Error loading teams for date:', error);
      // Return empty object on error
      setTimeBlockTeams({});
      return {};
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get counts for all teams and blocks with odd number of teams
   */
  const getTeamCountStatus = useCallback(() => {
    // Count total teams across all time blocks
    const total = Object.values(timeBlockTeams).reduce(
      (sum, teams) => sum + (teams?.length || 0),
      0
    );

    // Count blocks with odd number of teams
    const odd = Object.values(timeBlockTeams).filter(
      (teams) => teams && teams.length % 2 !== 0
    ).length;

    return { total, odd };
  }, [timeBlockTeams]);

  return {
    isLoading,
    timeBlockTeams,
    loadTeamsForDate,
    getTeamCountStatus,
  };
};

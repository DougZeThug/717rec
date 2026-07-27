import { useCallback, useState } from 'react';

import { DualBlockConfig, PairedTimeBlockTeamsMap, TimeBlockTeamsMap } from '@/types/autoSchedule';
import { getAllBackToBackTeams } from '@/utils/autoSchedule/teamLoaderUtils';
import { normalizeDate } from '@/utils/dateNormalization';
import { errorLog, scheduleLog } from '@/utils/logger';

/**
 * Hook for loading team schedules and handling team count status
 * - Enhanced with improved date handling and error detection
 * - Added support for dual block mode
 */
export const useTeamScheduleLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [timeBlockTeams, setTimeBlockTeams] = useState<TimeBlockTeamsMap>({});
  const [pairedTimeBlockTeams, setPairedTimeBlockTeams] = useState<PairedTimeBlockTeamsMap>({});

  /**
   * Load teams for all time blocks for a specific date
   * Improved date handling and error detection
   * Added dual block mode support
   */
  const loadTeamsForDate = useCallback(
    async (
      date: Date,
      dualBlockMode = false,
      dualBlockConfig?: DualBlockConfig
    ): Promise<TimeBlockTeamsMap> => {
      setIsLoading(true);

      try {
        scheduleLog('loadTeamsForDate called with:', {
          date: date,
          normalizedDate: normalizeDate(date, 'loadTeamsForDate'),
          dualBlockMode,
        });

        // Ensure the date is properly formatted to prevent timezone issues
        const safeDate = new Date(date);
        safeDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone edge cases

        // Use the new back-to-back team loading function
        const timeBlocksData = await getAllBackToBackTeams(safeDate);

        // Update state with standard time block format
        setTimeBlockTeams(timeBlocksData);

        // If dual block mode is enabled, also load paired blocks
        if (dualBlockMode && dualBlockConfig) {
          const primaryBlock = dualBlockConfig.primaryBlock || 'Early';
          const secondaryBlock = dualBlockConfig.secondaryBlock || 'Late';

          // Create paired blocks from loaded data
          const primaryTeams = timeBlocksData[primaryBlock] || [];
          const secondaryTeams = timeBlocksData[secondaryBlock] || [];

          const pairKey = `${primaryBlock}-${secondaryBlock}`;
          const pairedBlocks = {
            [pairKey]: {
              primaryBlock,
              secondaryBlock,
              primaryTeams,
              secondaryTeams,
            },
          };

          setPairedTimeBlockTeams(pairedBlocks);

          scheduleLog('Loaded paired blocks for dual mode:', pairedBlocks);
        } else {
          // Reset paired blocks state if not in dual mode
          setPairedTimeBlockTeams({});
        }

        scheduleLog('Team loading completed', {
          timeBlockCount: Object.keys(timeBlocksData).length,
          totalTeams: Object.values(timeBlocksData).flat().length,
          dualMode: dualBlockMode,
        });

        // Return standard time blocks
        return timeBlocksData;
      } catch (error) {
        errorLog('Error loading teams for date:', error);
        // Return empty object on error
        setTimeBlockTeams({});
        setPairedTimeBlockTeams({});
        return {};
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

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
    pairedTimeBlockTeams,
    loadTeamsForDate,
    getTeamCountStatus,
  };
};


import { useState, useCallback } from 'react';
import { TimeBlockTeamsMap } from '@/types/autoSchedule';
import { getTeamsByTimeBlock } from '@/utils/autoSchedule/teamLoaderUtils';
import { TIME_BLOCKS } from '@/utils/autoSchedule/constants';
import { normalizeDate } from '@/utils/dateNormalization';

export const useTeamOperations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [timeBlockTeams, setTimeBlockTeams] = useState<TimeBlockTeamsMap>({});

  /**
   * Load teams for all time blocks for a specific date
   * With improved date handling
   */
  const handleLoadTeams = useCallback(async (date: Date | null): Promise<TimeBlockTeamsMap> => {
    if (!date) {
      console.warn("No date provided to handleLoadTeams");
      return {};
    }
    
    setIsLoading(true);
    
    try {
      console.log("useTeamOperations - loadTeamsForDate called with:", {
        date: date,
        dateString: date.toString(),
        dateIso: date.toISOString(),
        normalizedDate: normalizeDate(date, 'loadTeamsForDate')
      });
      
      // Ensure the date is properly formatted to prevent timezone issues
      const safeDate = new Date(date);
      safeDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone edge cases
      
      console.log("Using safe date for team loading:", {
        safeDate,
        safeDateString: safeDate.toString(),
        safeDateIso: safeDate.toISOString(),
        normalizedSafeDate: normalizeDate(safeDate, 'safeDate')
      });
      
      const timeBlocksData: TimeBlockTeamsMap = {};
      
      // Load teams for each time block concurrently for better performance
      const timeBlockPromises = Object.keys(TIME_BLOCKS).map(async (block) => {
        const teams = await getTeamsByTimeBlock(safeDate, block);
        return { block, teams };
      });
      
      // Wait for all promises to resolve
      const results = await Promise.all(timeBlockPromises);
      
      // Populate the time blocks data
      results.forEach(({ block, teams }) => {
        // Only include time blocks that have teams
        if (teams && teams.length > 0) {
          timeBlocksData[block] = teams;
        } else {
          // Include empty blocks too, for UI consistency
          timeBlocksData[block] = [];
        }
      });
      
      console.log("Team loading completed", {
        date: safeDate,
        normalizedDate: normalizeDate(safeDate, 'complete'),
        timeBlockCount: Object.keys(timeBlocksData).length,
        totalTeams: Object.values(timeBlocksData).flat().length
      });
      
      // Update state
      setTimeBlockTeams(timeBlocksData);
      return timeBlocksData;
    } catch (error) {
      console.error('Error loading teams for date:', error);
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
    const total = Object.values(timeBlockTeams)
      .reduce((sum, teams) => sum + (teams?.length || 0), 0);
    
    // Count blocks with odd number of teams 
    const odd = Object.values(timeBlockTeams)
      .filter(teams => teams && teams.length % 2 !== 0)
      .length;
    
    return { total, odd };
  }, [timeBlockTeams]);

  return {
    isLoading,
    timeBlockTeams,
    setTimeBlockTeams,
    handleLoadTeams,
    getTeamCountStatus
  };
};

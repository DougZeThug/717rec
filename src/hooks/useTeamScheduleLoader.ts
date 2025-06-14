import { useState, useCallback } from 'react';
import { TimeBlockTeamsMap, PairedTimeBlockTeamsMap, DualBlockConfig } from '@/types/autoSchedule';
import { getTeamsByTimeBlock, getAllBackToBackTeams } from '@/utils/autoSchedule/teamLoaderUtils';
import { TIME_BLOCKS } from '@/utils/autoSchedule/constants';
import { normalizeDate } from '@/utils/dateNormalization';

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
  const loadTeamsForDate = useCallback(async (
    date: Date, 
    dualBlockMode = false,
    dualBlockConfig?: DualBlockConfig
  ): Promise<TimeBlockTeamsMap> => {
    setIsLoading(true);
    
    try {
      console.log("useTeamScheduleLoader - loadTeamsForDate called with:", {
        date: date,
        dateString: date.toString(),
        dateIso: date.toISOString(),
        normalizedDate: normalizeDate(date, 'loadTeamsForDate'),
        dualBlockMode
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
            secondaryTeams
          }
        };
        
        setPairedTimeBlockTeams(pairedBlocks);
        
        console.log("Loaded paired blocks for dual mode:", pairedBlocks);
      } else {
        // Reset paired blocks state if not in dual mode
        setPairedTimeBlockTeams({});
      }
      
      console.log("Team loading completed", {
        date: safeDate,
        normalizedDate: normalizeDate(safeDate, 'complete'),
        timeBlockCount: Object.keys(timeBlocksData).length,
        totalTeams: Object.values(timeBlocksData).flat().length,
        dualMode: dualBlockMode
      });
      
      // Return standard time blocks
      return timeBlocksData;
    } catch (error) {
      console.error('Error loading teams for date:', error);
      // Return empty object on error
      setTimeBlockTeams({});
      setPairedTimeBlockTeams({});
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
  
  /**
   * Get counts specifically for dual block mode
   */
  const getDualBlockCountStatus = useCallback(() => {
    if (Object.keys(pairedTimeBlockTeams).length === 0) {
      return { total: 0, paired: 0, unpaired: 0, odd: false };
    }
    
    // Get first pair (typically there's only one in dual mode)
    const pair = Object.values(pairedTimeBlockTeams)[0];
    
    // Count teams in each block
    const primaryCount = pair.primaryTeams.length;
    const secondaryCount = pair.secondaryTeams.length;
    const total = primaryCount + secondaryCount;
    
    // Determine if either block has an odd count
    const odd = (primaryCount % 2 !== 0) || (secondaryCount % 2 !== 0);
    
    // Create map of team IDs from primary block
    const primaryTeamIds = new Set(pair.primaryTeams.map(team => team.id));
    
    // Count teams that appear in both blocks
    const teamsInBothBlocks = pair.secondaryTeams.filter(team => 
      primaryTeamIds.has(team.id)
    ).length;
    
    return { 
      total,
      paired: teamsInBothBlocks, 
      unpaired: total - teamsInBothBlocks,
      odd
    };
  }, [pairedTimeBlockTeams]);

  return {
    isLoading,
    timeBlockTeams,
    pairedTimeBlockTeams,
    loadTeamsForDate,
    getTeamCountStatus,
    getDualBlockCountStatus
  };
};

export default useTeamScheduleLoader;

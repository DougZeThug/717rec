
import { useState, useCallback } from 'react';
import { TimeBlockTeamsMap, PairedTimeBlockTeamsMap, DualBlockConfig } from '@/types/autoSchedule';
import { getTeamsByTimeBlock } from '@/utils/autoSchedule/teamLoaderUtils';
import { TIME_BLOCKS } from '@/utils/autoSchedule/constants';
import { normalizeDate } from '@/utils/dateNormalization';
import { createTimeBlockPairs } from '@/utils/autoSchedule/dualBlockUtils';
import { balanceTeamsBetweenBlocks } from '@/utils/autoSchedule/dualBlock';

export const useTeamOperations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [timeBlockTeams, setTimeBlockTeams] = useState<TimeBlockTeamsMap>({});
  const [pairedTimeBlockTeams, setPairedTimeBlockTeams] = useState<PairedTimeBlockTeamsMap>({});

  /**
   * Load teams for all time blocks for a specific date
   * With improved date handling and dual block support
   */
  const handleLoadTeams = useCallback(async (
    date: Date | null, 
    dualBlockMode: boolean = false, 
    dualBlockConfig: DualBlockConfig = {}
  ): Promise<TimeBlockTeamsMap> => {
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
      
      // Update state with regular time block structure
      setTimeBlockTeams(timeBlocksData);
      
      // If dual block mode is enabled, create paired blocks structure
      if (dualBlockMode) {
        const pairedBlocks = createTimeBlockPairs(timeBlocksData, dualBlockConfig);
        setPairedTimeBlockTeams(pairedBlocks);
        
        console.log("Created paired time blocks:", pairedBlocks);
      } else {
        // Reset paired blocks if not in dual mode
        setPairedTimeBlockTeams({});
      }
      
      console.log("Team loading completed", {
        date: safeDate,
        normalizedDate: normalizeDate(safeDate, 'complete'),
        timeBlockCount: Object.keys(timeBlocksData).length,
        totalTeams: Object.values(timeBlocksData).flat().length,
        dualBlockMode
      });
      
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
   * Balance team counts for dual block mode
   */
  const balanceDualBlockTeams = useCallback((
    dualBlockConfig: DualBlockConfig = {}
  ): { 
    balancedTeams: TimeBlockTeamsMap, 
    unmatchedTeamIds: string[] 
  } => {
    // Get block names from config or use defaults
    const primaryBlock = dualBlockConfig.primaryBlock || 'Early';
    const secondaryBlock = dualBlockConfig.secondaryBlock || 'Late';
    
    // Get teams from each block
    const primaryTeams = timeBlockTeams[primaryBlock] || [];
    const secondaryTeams = timeBlockTeams[secondaryBlock] || [];
    
    // Balance teams between blocks using the refactored function
    const { 
      primaryAdjusted, 
      secondaryAdjusted, 
      unmatchedTeamIds 
    } = balanceTeamsBetweenBlocks(primaryTeams, secondaryTeams, dualBlockConfig);
    
    // Create balanced team block map
    const balancedTeams = { ...timeBlockTeams };
    balancedTeams[primaryBlock] = primaryAdjusted;
    balancedTeams[secondaryBlock] = secondaryAdjusted;
    
    return { balancedTeams, unmatchedTeamIds };
  }, [timeBlockTeams]);

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
    pairedTimeBlockTeams,
    setTimeBlockTeams,
    setPairedTimeBlockTeams,
    handleLoadTeams,
    balanceDualBlockTeams,
    getTeamCountStatus
  };
};

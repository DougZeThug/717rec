
import { useState, useCallback } from 'react';
import { Team } from '@/types';
import { TimeBlockTeamsMap, PairedTimeBlockTeamsMap, DualBlockConfig } from '@/types/autoSchedule';
import { getAllBackToBackTeams, getTeamsByBackToBackPair } from '@/utils/autoSchedule/teamLoaderUtils';
import { BACK_TO_BACK_PAIRS } from '@/utils/autoSchedule/constants';
import { normalizeScheduleDate, validateScheduleDate } from '@/utils/autoSchedule/dateUtils';
import { validateBackToBackPairAssignments } from '@/utils/autoSchedule/edgeCaseUtils';

export const useTeamOperations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [timeBlockTeams, setTimeBlockTeams] = useState<TimeBlockTeamsMap>({});
  const [originalTimeBlockTeams, setOriginalTimeBlockTeams] = useState<TimeBlockTeamsMap>({});
  const [pairedTimeBlockTeams, setPairedTimeBlockTeams] = useState<PairedTimeBlockTeamsMap>({});

  /**
   * Load teams for all back-to-back pairs for a specific date
   * Now always loads teams as back-to-back pairs
   */
  const handleLoadTeams = useCallback(async (
    date: Date | null, 
    dualBlockMode: boolean = false, 
    dualBlockConfig: DualBlockConfig = {}
  ): Promise<TimeBlockTeamsMap> => {
    if (!date) {
      console.error("❌ No date provided to handleLoadTeams");
      return {};
    }
    
    if (!validateScheduleDate(date, 'handleLoadTeams')) {
      console.error("❌ Invalid date provided to handleLoadTeams");
      return {};
    }
    
    setIsLoading(true);
    
    try {
      console.log("🔄 useTeamOperations - Loading teams for back-to-back pairs:", {
        date: date.toISOString(),
        normalizedDate: normalizeScheduleDate(date, 'loadTeamsForDate'),
        dualBlockMode
      });
      
      // Load all back-to-back pairs
      const backToBackTeams = await getAllBackToBackTeams(date);
      
      // Calculate total teams loaded
      const totalTeams = Object.values(backToBackTeams).reduce((sum, teams) => sum + teams.length, 0);
      console.log(`✅ Total teams loaded across all back-to-back pairs: ${totalTeams}`);
      
      // Validate the loaded teams
      const validation = validateBackToBackPairAssignments(backToBackTeams);
      if (!validation.isValid) {
        console.error('❌ Validation errors in back-to-back assignments:', validation.errors);
      }
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Validation warnings:', validation.warnings);
      }
      
      // Warn if no teams were loaded
      if (totalTeams === 0) {
        console.warn(`⚠️ WARNING: No teams loaded for date ${normalizeScheduleDate(date, 'loadTeamsComplete')}. Check database and date format.`);
      }
      
      // Update state with back-to-back structure
      setTimeBlockTeams(backToBackTeams);
      setOriginalTimeBlockTeams(backToBackTeams); // Store original loaded teams
      
      // If dual block mode is enabled, create paired blocks structure
      if (dualBlockMode) {
        const pairedBlocks = createPairedBlocksFromBackToBack(backToBackTeams, dualBlockConfig);
        setPairedTimeBlockTeams(pairedBlocks);
        console.log("Created paired time blocks from back-to-back data:", pairedBlocks);
      } else {
        setPairedTimeBlockTeams({});
      }
      
      return backToBackTeams;
    } catch (error) {
      console.error('❌ Error loading back-to-back teams for date:', error);
      setTimeBlockTeams({});
      setOriginalTimeBlockTeams({});
      setPairedTimeBlockTeams({});
      return {};
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Load teams for a specific back-to-back pair
   */
  const loadTeamsForPair = useCallback(async (
    date: Date,
    pairName: string
  ): Promise<Team[]> => {
    if (!validateScheduleDate(date, `loadTeamsForPair-${pairName}`)) {
      return [];
    }
    
    try {
      const teams = await getTeamsByBackToBackPair(date, pairName);
      console.log(`Loaded ${teams.length} teams for ${pairName} pair`);
      return teams;
    } catch (error) {
      console.error(`Error loading teams for ${pairName} pair:`, error);
      return [];
    }
  }, []);
  
  /**
   * Balance team counts for back-to-back pairs
   * Ensures even numbers of teams in each pair
   */
  const balanceBackToBackTeams = useCallback((
    dualBlockConfig: DualBlockConfig = {}
  ): { 
    balancedTeams: TimeBlockTeamsMap, 
    unmatchedTeamIds: string[] 
  } => {
    const balancedTeams: TimeBlockTeamsMap = {};
    const unmatchedTeamIds: string[] = [];
    
    Object.entries(timeBlockTeams).forEach(([pairName, teams]) => {
      if (!teams || teams.length === 0) {
        balancedTeams[pairName] = [];
        return;
      }
      
      if (teams.length % 2 === 0) {
        // Even number - no balancing needed
        balancedTeams[pairName] = [...teams];
      } else {
        // Odd number - remove one team based on strategy
        const teamsCopy = [...teams];
        let removedTeam: Team | undefined;
        
        switch (dualBlockConfig.unmatchedTeamStrategy) {
          case 'lowest-rank':
            teamsCopy.sort((a, b) => (a.power_score || 0) - (b.power_score || 0));
            removedTeam = teamsCopy.shift();
            break;
          case 'highest-rank':
            teamsCopy.sort((a, b) => (b.power_score || 0) - (a.power_score || 0));
            removedTeam = teamsCopy.shift();
            break;
          case 'random':
          default:
            const randomIndex = Math.floor(Math.random() * teamsCopy.length);
            removedTeam = teamsCopy.splice(randomIndex, 1)[0];
        }
        
        if (removedTeam) {
          unmatchedTeamIds.push(removedTeam.id);
          console.log(`Removed team ${removedTeam.name} from ${pairName} pair to balance team count`);
        }
        
        balancedTeams[pairName] = teamsCopy;
      }
    });
    
    return { balancedTeams, unmatchedTeamIds };
  }, [timeBlockTeams]);

  /**
   * Get counts for all teams and pairs with odd number of teams
   */
  const getTeamCountStatus = useCallback(() => {
    const total = Object.values(timeBlockTeams)
      .reduce((sum, teams) => sum + (teams?.length || 0), 0);
    
    const odd = Object.values(timeBlockTeams)
      .filter(teams => teams && teams.length % 2 !== 0)
      .length;
    
    return { total, odd };
  }, [timeBlockTeams]);

  return {
    isLoading,
    timeBlockTeams,
    originalTimeBlockTeams,
    pairedTimeBlockTeams,
    setTimeBlockTeams,
    setPairedTimeBlockTeams,
    handleLoadTeams,
    loadTeamsForPair,
    balanceBackToBackTeams,
    getTeamCountStatus
  };
};

/**
 * Helper function to create paired blocks structure from back-to-back data
 */
function createPairedBlocksFromBackToBack(
  backToBackTeams: TimeBlockTeamsMap,
  dualBlockConfig: DualBlockConfig
): PairedTimeBlockTeamsMap {
  const primaryBlock = dualBlockConfig.primaryBlock || 'Early';
  const secondaryBlock = dualBlockConfig.secondaryBlock || 'Late';
  
  const primaryTeams = backToBackTeams[primaryBlock] || [];
  const secondaryTeams = backToBackTeams[secondaryBlock] || [];
  
  const pairKey = `${primaryBlock}-${secondaryBlock}`;
  
  return {
    [pairKey]: {
      primaryBlock,
      secondaryBlock,
      primaryTeams,
      secondaryTeams
    }
  };
}

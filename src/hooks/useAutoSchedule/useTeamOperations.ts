import { useCallback, useEffect, useRef, useState } from 'react';

import { Team } from '@/types';
import { DualBlockConfig, PairedTimeBlockTeamsMap, TimeBlockTeamsMap } from '@/types/autoSchedule';
import { normalizeScheduleDate, validateScheduleDate } from '@/utils/autoSchedule/dateUtils';
import { validateBackToBackPairAssignments } from '@/utils/autoSchedule/edgeCaseUtils';
import {
  getAllBackToBackTeams,
  getTeamsByBackToBackPair,
} from '@/utils/autoSchedule/teamLoaderUtils';
import { errorLog, scheduleLog, warnLog } from '@/utils/logger';

import { loadAutoScheduleState, saveAutoScheduleState } from './storage';

export const useTeamOperations = () => {
  // Load persisted state on mount
  const persistedState = useRef(loadAutoScheduleState());

  const [isLoading, setIsLoading] = useState(false);

  // Initialize from persisted state if available
  const [timeBlockTeams, setTimeBlockTeams] = useState<TimeBlockTeamsMap>(
    () => persistedState.current?.timeBlockTeams || {}
  );
  const [originalTimeBlockTeams, setOriginalTimeBlockTeams] = useState<TimeBlockTeamsMap>(
    () => persistedState.current?.originalTimeBlockTeams || {}
  );
  const [pairedTimeBlockTeams, setPairedTimeBlockTeams] = useState<PairedTimeBlockTeamsMap>({});
  // Maps team ID to array of block names (supports double headers in multiple blocks)
  const [teamBlockMap, setTeamBlockMap] = useState<Record<string, string[]>>(
    () => persistedState.current?.teamBlockMap || {}
  );

  // Persist team data when it changes
  useEffect(() => {
    // Only persist if we have data
    if (Object.keys(timeBlockTeams).length > 0 || Object.keys(teamBlockMap).length > 0) {
      saveAutoScheduleState({
        timeBlockTeams,
        originalTimeBlockTeams,
        teamBlockMap,
      });
    }
  }, [timeBlockTeams, originalTimeBlockTeams, teamBlockMap]);

  /**
   * Load teams for all back-to-back pairs for a specific date
   * Now always loads teams as back-to-back pairs
   */
  const handleLoadTeams = useCallback(
    async (
      date: Date | null,
      dualBlockMode: boolean = false,
      dualBlockConfig: DualBlockConfig = {}
    ): Promise<TimeBlockTeamsMap> => {
      if (!date) {
        errorLog('No date provided to handleLoadTeams');
        return {};
      }

      if (!validateScheduleDate(date, 'handleLoadTeams')) {
        errorLog('Invalid date provided to handleLoadTeams');
        return {};
      }

      setIsLoading(true);

      try {
        scheduleLog('Loading teams for back-to-back pairs:', {
          date: date.toISOString(),
          normalizedDate: normalizeScheduleDate(date, 'loadTeamsForDate'),
          dualBlockMode,
        });

        // Load all back-to-back pairs
        const backToBackTeams = await getAllBackToBackTeams(date);

        // Build team-to-block mapping for defensive validation
        // Now supports arrays to handle double header teams in multiple blocks
        const blockMap: Record<string, string[]> = {};

        scheduleLog('Team Loading Summary by Block:');
        Object.entries(backToBackTeams).forEach(([pairName, teams]) => {
          scheduleLog(`  ${pairName}: ${teams.length} teams`);
          teams.forEach((team) => {
            // Initialize array if needed
            if (!blockMap[team.id]) {
              blockMap[team.id] = [];
            }
            // Add this block to the team's list (supports double headers)
            if (!blockMap[team.id].includes(pairName)) {
              blockMap[team.id].push(pairName);
              // Log double header detection
              if (blockMap[team.id].length > 1) {
                scheduleLog(
                  `Double header detected: Team "${team.name}" is in blocks: ${blockMap[team.id].join(', ')}`
                );
              }
            }
            scheduleLog(`    - ${team.name} (${team.divisionName || 'No Division'})`);
          });
        });

        // Store the team-to-block mapping
        setTeamBlockMap(blockMap);

        // Calculate total teams loaded
        const totalTeams = Object.values(backToBackTeams).reduce(
          (sum, teams) => sum + teams.length,
          0
        );
        scheduleLog(
          `Total teams loaded: ${totalTeams} teams across ${Object.keys(backToBackTeams).length} blocks`
        );

        // Validate the loaded teams
        const validation = validateBackToBackPairAssignments(backToBackTeams);
        if (!validation.isValid) {
          errorLog('Validation errors in back-to-back assignments:', validation.errors);
        }
        if (validation.warnings.length > 0) {
          warnLog('Validation warnings:', validation.warnings);
        }

        // Warn if no teams were loaded
        if (totalTeams === 0) {
          warnLog(
            `WARNING: No teams loaded for date ${normalizeScheduleDate(date, 'loadTeamsComplete')}. Check database and date format.`
          );
        }

        // Update state with back-to-back structure
        setTimeBlockTeams(backToBackTeams);
        setOriginalTimeBlockTeams(backToBackTeams); // Store original loaded teams

        // If dual block mode is enabled, create paired blocks structure
        if (dualBlockMode) {
          const pairedBlocks = createPairedBlocksFromBackToBack(backToBackTeams, dualBlockConfig);
          setPairedTimeBlockTeams(pairedBlocks);
          scheduleLog('Created paired time blocks from back-to-back data:', pairedBlocks);
        } else {
          setPairedTimeBlockTeams({});
        }

        return backToBackTeams;
      } catch (error) {
        errorLog('Error loading back-to-back teams for date:', error);
        setTimeBlockTeams({});
        setOriginalTimeBlockTeams({});
        setPairedTimeBlockTeams({});
        return {};
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Load teams for a specific back-to-back pair
   */
  const loadTeamsForPair = useCallback(async (date: Date, pairName: string): Promise<Team[]> => {
    if (!validateScheduleDate(date, `loadTeamsForPair-${pairName}`)) {
      return [];
    }

    try {
      const teams = await getTeamsByBackToBackPair(date, pairName);
      scheduleLog(`Loaded ${teams.length} teams for ${pairName} pair`);
      return teams;
    } catch (error) {
      errorLog(`Error loading teams for ${pairName} pair:`, error);
      return [];
    }
  }, []);

  /**
   * Balance team counts for back-to-back pairs
   * Ensures even numbers of teams in each pair
   */
  const balanceBackToBackTeams = useCallback(
    (
      dualBlockConfig: DualBlockConfig = {}
    ): {
      balancedTeams: TimeBlockTeamsMap;
      unmatchedTeamIds: string[];
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
            scheduleLog(
              `Removed team ${removedTeam.name} from ${pairName} pair to balance team count`
            );
          }

          balancedTeams[pairName] = teamsCopy;
        }
      });

      return { balancedTeams, unmatchedTeamIds };
    },
    [timeBlockTeams]
  );

  /**
   * Get counts for all teams and pairs with odd number of teams
   */
  const getTeamCountStatus = useCallback(() => {
    const total = Object.values(timeBlockTeams).reduce(
      (sum, teams) => sum + (teams?.length || 0),
      0
    );

    const odd = Object.values(timeBlockTeams).filter(
      (teams) => teams && teams.length % 2 !== 0
    ).length;

    return { total, odd };
  }, [timeBlockTeams]);

  return {
    isLoading,
    timeBlockTeams,
    originalTimeBlockTeams,
    pairedTimeBlockTeams,
    teamBlockMap,
    setTimeBlockTeams,
    setPairedTimeBlockTeams,
    handleLoadTeams,
    loadTeamsForPair,
    balanceBackToBackTeams,
    getTeamCountStatus,
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
      secondaryTeams,
    },
  };
}

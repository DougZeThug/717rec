
import { Team } from "@/types";
import { DualBlockConfig, DualBlockValidationResult, DualBlockPairingState, NotificationCallback } from "@/types/dualBlock";
import { TeamPairing, TimeBlockTeamsMap, PairedTimeBlockTeamsMap } from "@/types/autoSchedule";

/**
 * Default block names if not specified in config
 */
export const DEFAULT_BLOCKS = {
  PRIMARY: 'Early',
  SECONDARY: 'Late'
};

/**
 * Validate that teams are properly configured for dual block pairing
 */
export function validateDualBlockTeams(
  timeBlockTeams: { [timeBlock: string]: Team[] },
  config: DualBlockConfig,
  notify?: NotificationCallback
): DualBlockValidationResult {
  const primaryBlock = config.primaryBlock || DEFAULT_BLOCKS.PRIMARY;
  const secondaryBlock = config.secondaryBlock || DEFAULT_BLOCKS.SECONDARY;
  
  const primaryTeams = timeBlockTeams[primaryBlock] || [];
  const secondaryTeams = timeBlockTeams[secondaryBlock] || [];
  
  // Check if blocks exist
  if (primaryTeams.length === 0 || secondaryTeams.length === 0) {
    const errorMessage = `Dual match mode requires teams in both ${primaryBlock} and ${secondaryBlock} blocks`;
    
    if (notify) {
      notify({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
    
    return { isValid: false, errorMessage };
  }
  
  // Check if team counts match
  if (primaryTeams.length !== secondaryTeams.length) {
    const warningMessage = `${primaryBlock} block has ${primaryTeams.length} teams but ${secondaryBlock} has ${secondaryTeams.length} teams`;
    
    if (notify) {
      notify({
        title: "Warning",
        description: warningMessage,
        variant: "default"
      });
    }
    
    return { 
      isValid: true, 
      warningMessages: [warningMessage]
    };
  }
  
  return { isValid: true };
}

/**
 * Handle odd number of teams in dual block mode by selecting one team to exclude
 */
export function handleOddTeamCount(
  teams: Team[], 
  config: DualBlockConfig,
  notify?: NotificationCallback
): { adjustedTeams: Team[], unmatchedTeamId: string } {
  let unmatchedTeamId = '';
  let removedTeam: Team | null = null;
  const adjustedTeams = [...teams];
  
  // Select team to remove based on strategy
  switch (config.unmatchedTeamStrategy) {
    case 'lowest-rank':
      // Sort by power score ascending and remove the lowest
      adjustedTeams.sort((a, b) => (a.power_score || 0) - (b.power_score || 0));
      removedTeam = adjustedTeams.shift() || null;
      break;
      
    case 'manual':
      // This would be handled elsewhere - just validate we have even count
      if (adjustedTeams.length % 2 !== 0) {
        throw new Error("Manual strategy selected but odd team count provided");
      }
      break;
      
    case 'random':
    default:
      // Remove random team
      const randomIndex = Math.floor(Math.random() * adjustedTeams.length);
      removedTeam = adjustedTeams.splice(randomIndex, 1)[0];
  }
  
  if (removedTeam) {
    unmatchedTeamId = removedTeam.id;
    
    if (notify) {
      notify({
        title: "Warning",
        description: `Odd number of teams. Team "${removedTeam.name}" will not be scheduled.`,
        variant: "default"
      });
    }
  }
  
  return { adjustedTeams, unmatchedTeamId };
}

/**
 * Create cross-block compatibility adjustments to ensure teams
 * play against different opponents in each block
 */
export function createCrossBlockCompatibilityAdjuster(
  pairings: TeamPairing[],
): (team1: Team, team2: Team) => number {
  // Create map of team ID to opponent ID for quick lookup
  const opponentMap = new Map<string, string>();
  
  pairings.forEach(pair => {
    opponentMap.set(pair.team1.id, pair.team2.id);
    opponentMap.set(pair.team2.id, pair.team1.id);
  });
  
  // Return a function that applies heavy penalty for matching with same opponent
  return (team1: Team, team2: Team) => {
    if (opponentMap.get(team1.id) === team2.id) {
      return -100; // Strong negative score to avoid matching
    }
    return 0; // No adjustment
  };
}

/**
 * Create time block pairs from individual time blocks
 */
export function createTimeBlockPairs(
  timeBlockTeams: TimeBlockTeamsMap,
  config: DualBlockConfig
): PairedTimeBlockTeamsMap {
  const { primaryBlock = DEFAULT_BLOCKS.PRIMARY, secondaryBlock = DEFAULT_BLOCKS.SECONDARY } = config;
  
  // Get teams from blocks or empty arrays if not found
  const primaryTeams = timeBlockTeams[primaryBlock] || [];
  const secondaryTeams = timeBlockTeams[secondaryBlock] || [];
  
  // Create a single pair entry with both blocks
  const pairKey = `${primaryBlock}-${secondaryBlock}`;
  const pairedBlocks: PairedTimeBlockTeamsMap = {
    [pairKey]: {
      primaryBlock,
      secondaryBlock,
      primaryTeams,
      secondaryTeams
    }
  };
  
  return pairedBlocks;
}

/**
 * Transform paired time block structure back to standard time blocks
 */
export function transformPairedTeamsToRegular(pairedBlocks: PairedTimeBlockTeamsMap): TimeBlockTeamsMap {
  const regularBlocks: TimeBlockTeamsMap = {};
  
  Object.values(pairedBlocks).forEach(pair => {
    regularBlocks[pair.primaryBlock] = pair.primaryTeams;
    regularBlocks[pair.secondaryBlock] = pair.secondaryTeams;
  });
  
  return regularBlocks;
}

/**
 * Balance team counts between paired blocks to ensure even numbers
 */
export function balanceTeamsBetweenBlocks(
  primaryTeams: Team[],
  secondaryTeams: Team[],
  config: DualBlockConfig = {}
): { primaryAdjusted: Team[], secondaryAdjusted: Team[], unmatchedTeamIds: string[] } {
  const unmatchedTeamIds: string[] = [];
  
  // Make copies so we don't modify the original arrays
  const primaryAdjusted = [...primaryTeams];
  const secondaryAdjusted = [...secondaryTeams];
  
  // Handle odd counts in each block
  if (primaryAdjusted.length % 2 !== 0) {
    const { adjustedTeams, unmatchedTeamId } = handleOddTeamCount(primaryAdjusted, config);
    if (unmatchedTeamId) unmatchedTeamIds.push(unmatchedTeamId);
    primaryAdjusted.length = 0; // Clear array
    primaryAdjusted.push(...adjustedTeams); // Fill with adjusted teams
  }
  
  if (secondaryAdjusted.length % 2 !== 0) {
    const { adjustedTeams, unmatchedTeamId } = handleOddTeamCount(secondaryAdjusted, config);
    if (unmatchedTeamId) unmatchedTeamIds.push(unmatchedTeamId);
    secondaryAdjusted.length = 0; // Clear array
    secondaryAdjusted.push(...adjustedTeams); // Fill with adjusted teams
  }
  
  return { primaryAdjusted, secondaryAdjusted, unmatchedTeamIds };
}

/**
 * Find common teams between primary and secondary blocks
 */
export function findCommonTeams(primaryTeams: Team[], secondaryTeams: Team[]): Team[] {
  // Create set of primary team IDs for fast lookup
  const primaryTeamIds = new Set(primaryTeams.map(team => team.id));
  
  // Filter secondary teams to find those that also exist in primary
  return secondaryTeams.filter(team => primaryTeamIds.has(team.id));
}

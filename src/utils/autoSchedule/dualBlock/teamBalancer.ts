
import { Team } from "@/types";
import { DualBlockConfig } from "@/types/autoSchedule";
import { NotificationCallback } from "@/types/dualBlock";

/**
 * Result of balancing teams between blocks
 */
export interface TeamBalanceResult {
  /**
   * Adjusted teams for the primary block
   */
  primaryAdjusted: Team[];

  /**
   * Adjusted teams for the secondary block
   */
  secondaryAdjusted: Team[];

  /**
   * IDs of teams that couldn't be matched due to odd numbers
   */
  unmatchedTeamIds: string[];
}

/**
 * Balances teams between two time blocks to ensure even counts in each
 * 
 * @param primaryTeams - Teams in the primary block
 * @param secondaryTeams - Teams in the secondary block
 * @param config - Configuration for dual block pairing
 * @param notifyCallback - Optional callback for notifications
 * @returns Team balance result with adjusted teams and unmatched team IDs
 */
export const balanceTeamsBetweenBlocks = (
  primaryTeams: Team[],
  secondaryTeams: Team[],
  config: DualBlockConfig = {},
  notifyCallback?: NotificationCallback
): TeamBalanceResult => {
  // Create copies of arrays to avoid modifying originals
  const primaryAdjusted = [...primaryTeams];
  const secondaryAdjusted = [...secondaryTeams];
  const unmatchedTeamIds: string[] = [];
  
  // Check if both blocks have even numbers of teams
  const primaryIsEven = primaryAdjusted.length % 2 === 0;
  const secondaryIsEven = secondaryAdjusted.length % 2 === 0;
  
  if (!primaryIsEven && !secondaryIsEven) {
    // Both blocks have odd counts
    // Strategy: Move lowest ranked team to unmatched
    
    const strategy = config.unmatchedTeamStrategy || 'lowest-rank';
    
    if (strategy === 'lowest-rank') {
      // Sort by power score (ascending)
      primaryAdjusted.sort((a, b) => (a.power_score || 0) - (b.power_score || 0));
      secondaryAdjusted.sort((a, b) => (a.power_score || 0) - (b.power_score || 0));
      
      // Remove lowest ranked team from primary block
      const removedTeam = primaryAdjusted.shift();
      
      if (removedTeam) {
        unmatchedTeamIds.push(removedTeam.id);
        
        if (notifyCallback) {
          notifyCallback({
            title: "Team Balancing",
            description: `Team "${removedTeam.name}" was removed from scheduling due to odd team count.`,
            variant: "default"
          });
        }
      }
    } else if (strategy === 'random') {
      // Randomly choose which block to adjust
      if (Math.random() > 0.5) {
        const removedTeam = primaryAdjusted.pop();
        if (removedTeam) unmatchedTeamIds.push(removedTeam.id);
      } else {
        const removedTeam = secondaryAdjusted.pop();
        if (removedTeam) unmatchedTeamIds.push(removedTeam.id);
      }
    }
    // For 'manual' strategy, we don't automatically adjust teams
    
  } else if (!primaryIsEven) {
    // Only primary block has odd count - remove one team from primary to make it even
    const strategy = config.unmatchedTeamStrategy || 'lowest-rank';
    
    if (strategy === 'lowest-rank') {
      primaryAdjusted.sort((a, b) => (a.power_score || 0) - (b.power_score || 0));
      const removedTeam = primaryAdjusted.shift();
      if (removedTeam) {
        unmatchedTeamIds.push(removedTeam.id);
        if (notifyCallback) {
          notifyCallback({
            title: "Team Balancing",
            description: `Team "${removedTeam.name}" was removed from scheduling due to odd team count.`,
            variant: "default"
          });
        }
      }
    } else {
      // Random or other strategy
      const removedTeam = primaryAdjusted.pop();
      if (removedTeam) unmatchedTeamIds.push(removedTeam.id);
    }
  } else if (!secondaryIsEven) {
    // Only secondary block has odd count - remove one team from secondary to make it even
    const strategy = config.unmatchedTeamStrategy || 'lowest-rank';
    
    if (strategy === 'lowest-rank') {
      secondaryAdjusted.sort((a, b) => (a.power_score || 0) - (b.power_score || 0));
      const removedTeam = secondaryAdjusted.shift();
      if (removedTeam) {
        unmatchedTeamIds.push(removedTeam.id);
        if (notifyCallback) {
          notifyCallback({
            title: "Team Balancing",
            description: `Team "${removedTeam.name}" was removed from scheduling due to odd team count.`,
            variant: "default"
          });
        }
      }
    } else {
      // Random or other strategy
      const removedTeam = secondaryAdjusted.pop();
      if (removedTeam) unmatchedTeamIds.push(removedTeam.id);
    }
  }
  
  // Return the balanced teams
  return {
    primaryAdjusted,
    secondaryAdjusted,
    unmatchedTeamIds
  };
};

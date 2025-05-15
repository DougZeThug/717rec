
import { TeamPairing, TeamPairingMap, DualBlockConfig, PairingResult } from "@/types/autoSchedule";
import { Team } from "@/types";
import { NotificationCallback } from "@/types/dualBlock";
import { generatePairingsWithConfig } from "./pairingAlgorithm";
import { calculateConfigurableCompatibility } from "./compatibilityUtils";
import { haveTeamsPlayedBefore } from "./matchHistoryService";

/**
 * Calculate metrics for dual block pairings
 */
export const calculateDualBlockMetrics = (
  primaryBlockPairings: TeamPairing[],
  secondaryBlockPairings: TeamPairing[]
): {
  teamsWithBothMatches: number;
  teamsWithSingleMatch: number;
  crossBlockCompatibility: number;
} => {
  // Track team IDs and their match count
  const teamMatchCounts: Record<string, {
    matchCount: number;
    opponents: string[];
  }> = {};
  
  // Process primary block
  primaryBlockPairings.forEach(pairing => {
    const team1Id = pairing.team1.id;
    const team2Id = pairing.team2.id;
    
    if (!teamMatchCounts[team1Id]) teamMatchCounts[team1Id] = { matchCount: 0, opponents: [] };
    if (!teamMatchCounts[team2Id]) teamMatchCounts[team2Id] = { matchCount: 0, opponents: [] };
    
    teamMatchCounts[team1Id].matchCount++;
    teamMatchCounts[team1Id].opponents.push(team2Id);
    
    teamMatchCounts[team2Id].matchCount++;
    teamMatchCounts[team2Id].opponents.push(team1Id);
  });
  
  // Process secondary block
  secondaryBlockPairings.forEach(pairing => {
    const team1Id = pairing.team1.id;
    const team2Id = pairing.team2.id;
    
    if (!teamMatchCounts[team1Id]) teamMatchCounts[team1Id] = { matchCount: 0, opponents: [] };
    if (!teamMatchCounts[team2Id]) teamMatchCounts[team2Id] = { matchCount: 0, opponents: [] };
    
    teamMatchCounts[team1Id].matchCount++;
    teamMatchCounts[team1Id].opponents.push(team2Id);
    
    teamMatchCounts[team2Id].matchCount++;
    teamMatchCounts[team2Id].opponents.push(team1Id);
  });
  
  // Count teams with both matches and teams with only one match
  const teamsWithBothMatches = Object.values(teamMatchCounts).filter(tc => tc.matchCount === 2).length;
  const teamsWithSingleMatch = Object.values(teamMatchCounts).filter(tc => tc.matchCount === 1).length;
  
  // Calculate cross-block compatibility score
  // This measures how well the opponent assignments are distributed between blocks
  let crossBlockCompatibility = 0;
  let teamCount = 0;
  
  Object.values(teamMatchCounts).forEach(tc => {
    if (tc.matchCount === 2) {
      // Reward teams that have two different opponents
      const uniqueOpponents = new Set(tc.opponents);
      if (uniqueOpponents.size === 2) {
        crossBlockCompatibility += 10; // Perfect score for two different opponents
      } else {
        crossBlockCompatibility += 5; // Lower score for duplicate opponents
      }
      teamCount++;
    }
  });
  
  // Calculate average compatibility score
  crossBlockCompatibility = teamCount > 0 ? crossBlockCompatibility / teamCount : 0;
  
  return {
    teamsWithBothMatches,
    teamsWithSingleMatch,
    crossBlockCompatibility
  };
};

/**
 * Generate dual block pairings
 * This function generates pairings for two linked time blocks (typically Early and Late)
 * ensuring teams play in both blocks with different opponents
 */
export const generateDualBlockPairings = async (
  timeBlockTeams: Record<string, Team[]>,
  config: DualBlockConfig = {},
  notifyCallback?: NotificationCallback
): Promise<PairingResult | null> => {
  try {
    // Get primary and secondary block names
    const primaryBlock = config.primaryBlock || 'Early';
    const secondaryBlock = config.secondaryBlock || 'Late';
    
    // Ensure both blocks exist in the timeBlockTeams
    if (!timeBlockTeams[primaryBlock] || !timeBlockTeams[secondaryBlock]) {
      console.error(`Missing required blocks for dual mode: ${primaryBlock} or ${secondaryBlock}`);
      
      if (notifyCallback) {
        notifyCallback({
          title: "Configuration Error",
          description: `Dual match mode requires teams in both ${primaryBlock} and ${secondaryBlock} blocks.`,
          variant: "destructive"
        });
      }
      
      return null;
    }
    
    // Track teams that will participate in both blocks
    const primaryTeams = timeBlockTeams[primaryBlock];
    const secondaryTeams = timeBlockTeams[secondaryBlock];
    
    // First generate optimal pairings for the primary block
    console.log(`Generating primary block pairings for ${primaryTeams.length} teams`);
    const primaryPairings = await generatePairingsWithConfig(primaryTeams, {
      avoidRematches: config.avoidRematches,
      haveTeamsPlayedFn: haveTeamsPlayedBefore,
      getCompatibilityScoreFn: (team1, team2) => calculateConfigurableCompatibility(team1, team2, config.weights)
    });
    
    // Create a map of team IDs to their opponents in the primary block
    const primaryOpponents: Record<string, string> = {};
    primaryPairings.forEach(pairing => {
      primaryOpponents[pairing.team1.id] = pairing.team2.id;
      primaryOpponents[pairing.team2.id] = pairing.team1.id;
    });
    
    // Create constraints for secondary block to ensure teams have different opponents
    const secondaryConstraints = {
      avoidRematches: config.avoidRematches,
      haveTeamsPlayedFn: haveTeamsPlayedBefore,
      getCompatibilityScoreFn: (team1: Team, team2: Team) => {
        // Base compatibility score
        let score = calculateConfigurableCompatibility(team1, team2, config.weights);
        
        // Penalize heavily if teams are already opponents in the primary block
        if (primaryOpponents[team1.id] === team2.id || primaryOpponents[team2.id] === team1.id) {
          score -= 1000; // Large penalty to avoid same opponents
        }
        
        return score;
      }
    };
    
    // Generate secondary block pairings with constraints
    console.log(`Generating secondary block pairings for ${secondaryTeams.length} teams with opponent constraints`);
    const secondaryPairings = await generatePairingsWithConfig(secondaryTeams, secondaryConstraints);
    
    // Combine pairings into a TeamPairingMap
    const pairingsMap: TeamPairingMap = {};
    pairingsMap[primaryBlock] = primaryPairings;
    pairingsMap[secondaryBlock] = secondaryPairings;
    
    // Find teams that weren't matched (odd number of teams)
    const allTeamIds = new Set([
      ...primaryTeams.map(t => t.id),
      ...secondaryTeams.map(t => t.id)
    ]);
    
    const matchedTeamIds = new Set();
    
    // Add all matched teams from both blocks
    Object.values(pairingsMap).forEach(blockPairings => {
      blockPairings.forEach(pairing => {
        matchedTeamIds.add(pairing.team1.id);
        matchedTeamIds.add(pairing.team2.id);
      });
    });
    
    // Get unmatched team IDs
    const unmatchedTeamIds: string[] = [];
    allTeamIds.forEach(teamId => {
      if (!matchedTeamIds.has(teamId)) {
        unmatchedTeamIds.push(teamId);
      }
    });
    
    // Calculate metrics for the generated dual block pairings
    const metrics = calculateDualBlockMetrics(primaryPairings, secondaryPairings);
    console.log("Dual block pairing metrics:", metrics);
    
    // If teams have the same opponent in both blocks, warn the user
    const teamsWithSameOpponent = findTeamsWithSameOpponent(primaryPairings, secondaryPairings);
    if (teamsWithSameOpponent.length > 0 && notifyCallback) {
      notifyCallback({
        title: "Warning",
        description: `${teamsWithSameOpponent.length} teams have the same opponent in both blocks.`,
        variant: "default"
      });
    }
    
    return {
      pairings: pairingsMap,
      unmatchedTeamIds
    };
    
  } catch (error) {
    console.error("Error generating dual block pairings:", error);
    
    if (notifyCallback) {
      notifyCallback({
        title: "Error",
        description: "Failed to generate dual block pairings.",
        variant: "destructive"
      });
    }
    
    return null;
  }
};

/**
 * Find teams that have the same opponent in both blocks
 */
export const findTeamsWithSameOpponent = (
  primaryPairings: TeamPairing[],
  secondaryPairings: TeamPairing[]
): string[] => {
  // Map each team to their opponent in the primary block
  const primaryOpponents: Record<string, string> = {};
  primaryPairings.forEach(pairing => {
    primaryOpponents[pairing.team1.id] = pairing.team2.id;
    primaryOpponents[pairing.team2.id] = pairing.team1.id;
  });
  
  // Check if any team has the same opponent in the secondary block
  const teamsWithSameOpponent: string[] = [];
  
  secondaryPairings.forEach(pairing => {
    // Check team1
    if (primaryOpponents[pairing.team1.id] === pairing.team2.id) {
      teamsWithSameOpponent.push(pairing.team1.id);
    }
    
    // Check team2
    if (primaryOpponents[pairing.team2.id] === pairing.team1.id) {
      teamsWithSameOpponent.push(pairing.team2.id);
    }
  });
  
  return teamsWithSameOpponent;
};

/**
 * Balance teams between two blocks to ensure even numbers and team distribution
 */
export const balanceTeamsBetweenBlocks = (
  primaryTeams: Team[],
  secondaryTeams: Team[],
  config: DualBlockConfig = {}
): {
  primaryAdjusted: Team[];
  secondaryAdjusted: Team[];
  unmatchedTeamIds: string[];
} => {
  // Create maps of team IDs to team objects for quick lookup
  const primaryTeamMap = new Map(primaryTeams.map(team => [team.id, team]));
  const secondaryTeamMap = new Map(secondaryTeams.map(team => [team.id, team]));
  
  // Create sets for faster operations
  const primaryTeamIds = new Set(primaryTeams.map(team => team.id));
  const secondaryTeamIds = new Set(secondaryTeams.map(team => team.id));
  
  // Find teams in both blocks (overlap)
  const teamsInBothBlocks = Array.from(primaryTeamIds).filter(id => secondaryTeamIds.has(id));
  
  // Find teams only in one block
  const teamsOnlyInPrimary = Array.from(primaryTeamIds).filter(id => !secondaryTeamIds.has(id));
  const teamsOnlyInSecondary = Array.from(secondaryTeamIds).filter(id => !primaryTeamIds.has(id));
  
  console.log("Team distribution:", {
    teamsInBothBlocks: teamsInBothBlocks.length,
    teamsOnlyInPrimary: teamsOnlyInPrimary.length,
    teamsOnlyInSecondary: teamsOnlyInSecondary.length
  });
  
  let primaryAdjusted = [...primaryTeams];
  let secondaryAdjusted = [...secondaryTeams];
  
  // Make sure we have even numbers in both blocks
  const primaryCount = primaryAdjusted.length;
  const secondaryCount = secondaryAdjusted.length;
  
  // Find any team that needs to be removed (if odd counts)
  let unmatchedTeamIds: string[] = [];
  
  // If we have odd primary count, remove one team
  if (primaryCount % 2 !== 0) {
    if (config.unmatchedTeamStrategy === 'lowest-rank') {
      // Sort by wins (ascending) and remove the team with the least wins
      primaryAdjusted.sort((a, b) => (a.wins || 0) - (b.wins || 0));
      const removedTeam = primaryAdjusted.shift();
      if (removedTeam) unmatchedTeamIds.push(removedTeam.id);
    } else {
      // Default: remove the last team
      const removedTeam = primaryAdjusted.pop();
      if (removedTeam) unmatchedTeamIds.push(removedTeam.id);
    }
  }
  
  // If we have odd secondary count, remove one team
  if (secondaryCount % 2 !== 0) {
    if (config.unmatchedTeamStrategy === 'lowest-rank') {
      // Sort by wins (ascending) and remove the team with the least wins
      secondaryAdjusted.sort((a, b) => (a.wins || 0) - (b.wins || 0));
      const removedTeam = secondaryAdjusted.shift();
      if (removedTeam) unmatchedTeamIds.push(removedTeam.id);
    } else {
      // Default: remove the last team
      const removedTeam = secondaryAdjusted.pop();
      if (removedTeam) unmatchedTeamIds.push(removedTeam.id);
    }
  }
  
  return {
    primaryAdjusted,
    secondaryAdjusted,
    unmatchedTeamIds
  };
};

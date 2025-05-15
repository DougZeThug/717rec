
import { Team } from "@/types";
import { AlgorithmConfig, PairingResult, TeamPairing } from "@/types/autoSchedule";
import { DualBlockConfig, NotificationCallback, DualBlockPairingState } from "@/types/dualBlock";
import { calculateConfigurableCompatibility } from "./compatibilityUtils";
import { generatePairingsWithConfig } from "./pairingAlgorithm";
import { haveTeamsPlayedBefore } from "./matchHistoryService";
import { 
  DEFAULT_BLOCKS, 
  validateDualBlockTeams,
  handleOddTeamCount,
  createCrossBlockCompatibilityAdjuster
} from "./dualBlockUtils";

/**
 * Generate pairings that ensure each team plays in both Early and Late blocks
 * with different opponents in each block
 * 
 * @param timeBlockTeams Map of time blocks to team arrays
 * @param config Algorithm configuration options
 * @param notify Optional callback for notifications
 * @returns Promise that resolves to pairing result or null if error
 */
export async function generateDualBlockPairings(
  timeBlockTeams: {
    [timeBlock: string]: Team[];
  },
  config: DualBlockConfig,
  notify?: NotificationCallback
): Promise<PairingResult | null> {
  try {
    const primaryBlock = config.primaryBlock || DEFAULT_BLOCKS.PRIMARY;
    const secondaryBlock = config.secondaryBlock || DEFAULT_BLOCKS.SECONDARY;
    
    // Validate teams configuration
    const validationResult = validateDualBlockTeams(timeBlockTeams, config, notify);
    if (!validationResult.isValid) {
      return null;
    }
    
    // Start tracking pairing state
    const state: DualBlockPairingState = {
      earlyTeams: timeBlockTeams[primaryBlock] || [],
      lateTeams: timeBlockTeams[secondaryBlock] || [],
      earlyOpponents: new Map<string, string>(),
      hasOddTeams: false
    };
    
    // Ensure we have teams to work with
    if (state.earlyTeams.length === 0) {
      return null;
    }
    
    // Get combined teams for first round pairing
    const combinedTeams = [...state.earlyTeams];
    
    // Check if we have an odd number of teams
    state.hasOddTeams = combinedTeams.length % 2 !== 0;
    
    // Handle odd team count if needed
    if (state.hasOddTeams) {
      const { adjustedTeams, unmatchedTeamId } = handleOddTeamCount(
        combinedTeams, 
        config, 
        notify
      );
      
      state.unmatchedTeamId = unmatchedTeamId;
      
      // Update combined teams to the adjusted (even count) list
      combinedTeams.length = 0;
      combinedTeams.push(...adjustedTeams);
    }
    
    // Generate pairings for the early block
    const earlyPairings = await generatePairingsWithConfig(combinedTeams, {
      avoidRematches: config.avoidRematches,
      haveTeamsPlayedFn: haveTeamsPlayedBefore,
      getCompatibilityScoreFn: (team1, team2) => 
        calculateConfigurableCompatibility(team1, team2, config.weights)
    });
    
    // Store opponent relationships for second round
    earlyPairings.forEach(pair => {
      state.earlyOpponents.set(pair.team1.id, pair.team2.id);
      state.earlyOpponents.set(pair.team2.id, pair.team1.id);
    });
    
    // Create cross-block compatibility adjuster
    const crossBlockAdjuster = createCrossBlockCompatibilityAdjuster(earlyPairings);
    
    // Generate pairings for the late block with different opponents
    const latePairings = await generatePairingsWithConfig(combinedTeams, {
      avoidRematches: config.avoidRematches,
      haveTeamsPlayedFn: haveTeamsPlayedBefore,
      getCompatibilityScoreFn: (team1, team2) => {
        // Apply base compatibility
        const baseScore = calculateConfigurableCompatibility(
          team1, 
          team2, 
          config.weights
        );
        
        // Apply cross-block adjustment
        const crossBlockAdjustment = crossBlockAdjuster(team1, team2);
        
        return baseScore + crossBlockAdjustment;
      }
    });
    
    // Return the pairings for both blocks
    return {
      pairings: {
        [primaryBlock]: earlyPairings,
        [secondaryBlock]: latePairings
      },
      unmatchedTeamIds: state.hasOddTeams && state.unmatchedTeamId 
        ? [state.unmatchedTeamId] 
        : []
    };
    
  } catch (error) {
    console.error('Error generating dual block pairings:', error);
    
    if (notify) {
      notify({
        title: "Error",
        description: "Failed to generate dual block pairings: " + 
          (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive"
      });
    }
    
    return null;
  }
}

/**
 * Calculate metrics specific to dual block pairings
 * 
 * @param primaryBlockPairings Pairings for primary block
 * @param secondaryBlockPairings Pairings for secondary block
 * @returns Object containing dual match metrics
 */
export function calculateDualBlockMetrics(
  primaryBlockPairings: TeamPairing[],
  secondaryBlockPairings: TeamPairing[]
) {
  // Count teams that appear in both blocks
  const primaryTeamIds = new Set<string>();
  const secondaryTeamIds = new Set<string>();
  
  primaryBlockPairings.forEach(pair => {
    primaryTeamIds.add(pair.team1.id);
    primaryTeamIds.add(pair.team2.id);
  });
  
  secondaryBlockPairings.forEach(pair => {
    secondaryTeamIds.add(pair.team1.id);
    secondaryTeamIds.add(pair.team2.id);
  });
  
  // Find intersection
  let teamsWithBothMatches = 0;
  for (const id of primaryTeamIds) {
    if (secondaryTeamIds.has(id)) {
      teamsWithBothMatches++;
    }
  }
  
  // Calculate teams with only one match
  const teamsWithSingleMatch = 
    (primaryTeamIds.size - teamsWithBothMatches) + 
    (secondaryTeamIds.size - teamsWithBothMatches);
  
  // Calculate average compatibility across blocks
  let totalCrossBlockCompatibility = 0;
  let pairCount = 0;
  
  // Simplified cross-block compatibility calculation
  primaryBlockPairings.forEach(pair => {
    secondaryBlockPairings.forEach(secondPair => {
      if (pair.team1.id === secondPair.team1.id || 
          pair.team1.id === secondPair.team2.id ||
          pair.team2.id === secondPair.team1.id ||
          pair.team2.id === secondPair.team2.id) {
        totalCrossBlockCompatibility += Math.min(
          pair.compatibilityScore, 
          secondPair.compatibilityScore
        );
        pairCount++;
      }
    });
  });
  
  const crossBlockCompatibility = 
    pairCount > 0 ? totalCrossBlockCompatibility / pairCount : 0;
  
  return {
    teamsWithBothMatches,
    teamsWithSingleMatch,
    crossBlockCompatibility
  };
}

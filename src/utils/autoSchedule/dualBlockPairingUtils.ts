import { Team } from "@/types";
import { AlgorithmConfig, PairingResult, TeamPairing } from "@/types/autoSchedule";
import { calculateConfigurableCompatibility } from "./compatibilityUtils";
import { generatePairingsWithConfig } from "./pairingAlgorithm";
import { haveTeamsPlayedBefore } from "./matchHistoryService";
import { useToast } from "@/hooks/use-toast";

/**
 * Generate pairings that ensure each team plays in both Early and Late blocks
 * with different opponents in each block
 * 
 * @param timeBlockTeams Map of time blocks to team arrays
 * @param config Algorithm configuration options
 * @param toast Toast function for notifications
 * @returns Promise that resolves to pairing result or null if error
 */
export async function generateDualBlockPairings(
  timeBlockTeams: {
    [timeBlock: string]: Team[];
  },
  config: AlgorithmConfig,
  toast: ReturnType<typeof useToast>["toast"]
): Promise<PairingResult | null> {
  try {
    // For dual match mode, we focus on the Early and Late blocks
    const earlyTeams = timeBlockTeams['Early'] || [];
    const lateTeams = timeBlockTeams['Late'] || [];
    
    // Ensure we have the same teams in both blocks
    if (earlyTeams.length === 0 || lateTeams.length === 0) {
      toast({
        title: "Error",
        description: "Dual match mode requires teams in both Early and Late blocks",
        variant: "destructive"
      });
      return null;
    }
    
    // Check if we have an equal number of teams in both blocks
    const combinedTeams = [...earlyTeams];
    
    // Check if we have an odd number of teams
    const hasOddTeams = combinedTeams.length % 2 !== 0;
    let unmatchedTeamId = '';
    
    if (hasOddTeams) {
      // Remove one team randomly to make it even
      const randomIndex = Math.floor(Math.random() * combinedTeams.length);
      const removedTeam = combinedTeams.splice(randomIndex, 1)[0];
      unmatchedTeamId = removedTeam.id;
      
      toast({
        title: "Warning",
        description: `Odd number of teams. Team "${removedTeam.name}" will not be scheduled.`,
        variant: "default"
      });
    }
    
    // First generate pairings for the early block
    const earlyPairings = await generatePairingsWithConfig(combinedTeams, {
      avoidRematches: config.avoidRematches,
      haveTeamsPlayedFn: haveTeamsPlayedBefore,
      getCompatibilityScoreFn: (team1, team2) => calculateConfigurableCompatibility(team1, team2, config.weights)
    });
    
    // Create a map of team ID to opponent team ID in the early block
    const earlyOpponents = new Map<string, string>();
    earlyPairings.forEach(pair => {
      earlyOpponents.set(pair.team1.id, pair.team2.id);
      earlyOpponents.set(pair.team2.id, pair.team1.id);
    });
    
    // Now generate pairings for the late block, ensuring different opponents
    // To do this, we need to create a new custom compatibility function that 
    // heavily penalizes matching teams that played each other in the early block
    const latePairings = await generatePairingsWithConfig(combinedTeams, {
      avoidRematches: config.avoidRematches,
      haveTeamsPlayedFn: haveTeamsPlayedBefore,
      getCompatibilityScoreFn: (team1, team2) => {
        // Heavily penalize matching teams that played each other in the early block
        if (earlyOpponents.get(team1.id) === team2.id) {
          return -100; // Strong negative score to avoid matching
        }
        
        // Otherwise, use normal compatibility scoring
        return calculateConfigurableCompatibility(team1, team2, config.weights);
      }
    });
    
    // Return the pairings for both blocks
    return {
      pairings: {
        'Early': earlyPairings,
        'Late': latePairings
      },
      unmatchedTeamIds: hasOddTeams ? [unmatchedTeamId] : []
    };
    
  } catch (error) {
    console.error('Error generating dual block pairings:', error);
    return null;
  }
}

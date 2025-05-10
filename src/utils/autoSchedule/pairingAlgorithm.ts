
import { Team } from "@/types";
import { TeamPairing } from "@/types/autoSchedule";

type TeamPairingConfig = {
  avoidRematches?: boolean;
  haveTeamsPlayedFn: (team1Id: string, team2Id: string) => Promise<boolean>;
  getCompatibilityScoreFn: (team1: Team, team2: Team) => number;
  maxScore?: number;
  weights?: {
    powerScoreWeight?: number;
    sosWeight?: number;
    recordWeight?: number;
    gameRecordWeight?: number;
  };
};

/**
 * Generate team pairings with configurable options and optimization
 */
export async function generatePairingsWithConfig(
  teams: Team[], 
  config: TeamPairingConfig
): Promise<TeamPairing[]> {
  // Return empty array for insufficient teams
  if (teams.length < 2) return [];
  
  // Start tracking time for performance monitoring
  const startTime = performance.now();
  
  // Calculate all potential pairings with compatibility scores
  const potentialPairings: {team1: Team, team2: Team, score: number}[] = [];
  
  // Generate all possible pairs - O(n²) operation
  // Use batch processing to avoid UI freezing for large team counts
  const batchSize = 20;
  let processedCount = 0;
  
  for (let i = 0; i < teams.length - 1; i++) {
    const team1 = teams[i];
    
    for (let j = i + 1; j < teams.length; j++) {
      const team2 = teams[j];
      
      // Calculate compatibility score
      const score = config.getCompatibilityScoreFn(team1, team2);
      
      potentialPairings.push({
        team1,
        team2,
        score
      });
      
      // Allow UI to update every batchSize pairs
      processedCount++;
      if (processedCount % batchSize === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
  
  // Sort by compatibility score (highest first)
  potentialPairings.sort((a, b) => b.score - a.score);
  
  // Generate optimal pairings
  const finalPairings: TeamPairing[] = [];
  const assignedTeamIds = new Set<string>();
  
  // Filter out pairings with teams that have played before if avoidRematches is true
  if (config.avoidRematches) {
    // Apply match history filter - less optimal but faster
    // Check first batch of best pairs (to avoid checking all combinations)
    const topPairingsCount = Math.min(potentialPairings.length, teams.length * 2);
    const topPairings = potentialPairings.slice(0, topPairingsCount);
    
    for (const pairing of topPairings) {
      // Skip if either team is already assigned
      if (assignedTeamIds.has(pairing.team1.id) || assignedTeamIds.has(pairing.team2.id)) continue;
      
      // Check if teams have played before
      const hasPlayedBefore = await config.haveTeamsPlayedFn(pairing.team1.id, pairing.team2.id);
      
      // If teams haven't played before or we're not avoiding rematches, add the pairing
      if (!hasPlayedBefore || !config.avoidRematches) {
        finalPairings.push({
          team1: pairing.team1,
          team2: pairing.team2,
          compatibilityScore: pairing.score,
          hasPlayedBefore: hasPlayedBefore
        });
        
        // Mark these teams as assigned
        assignedTeamIds.add(pairing.team1.id);
        assignedTeamIds.add(pairing.team2.id);
      }
    }
  }
  
  // If we still have teams to pair (not all were paired in first pass)
  // Consider remaining pairs without match history filter
  if (assignedTeamIds.size < teams.length) {
    for (const pairing of potentialPairings) {
      // Skip if either team is already assigned
      if (assignedTeamIds.has(pairing.team1.id) || assignedTeamIds.has(pairing.team2.id)) continue;
      
      // Check if teams have played before
      const hasPlayedBefore = await config.haveTeamsPlayedFn(pairing.team1.id, pairing.team2.id);
      
      finalPairings.push({
        team1: pairing.team1,
        team2: pairing.team2,
        compatibilityScore: pairing.score,
        hasPlayedBefore: hasPlayedBefore
      });
      
      // Mark these teams as assigned
      assignedTeamIds.add(pairing.team1.id);
      assignedTeamIds.add(pairing.team2.id);
      
      // If all teams are paired, we're done
      if (assignedTeamIds.size === teams.length) break;
    }
  }
  
  // Log performance metrics
  const endTime = performance.now();
  console.log(`Pairing generation took ${(endTime - startTime).toFixed(2)}ms for ${teams.length} teams`);
  console.log(`Generated ${finalPairings.length} pairings out of ${teams.length / 2} possible`);
  
  return finalPairings;
}

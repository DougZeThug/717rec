
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
    divisionWeight?: number;
  };
};

/**
 * Generate team pairings ensuring each team gets exactly 2 matches per session
 */
export async function generatePairingsWithConfig(
  teams: Team[], 
  config: TeamPairingConfig
): Promise<TeamPairing[]> {
  // Return empty array for insufficient teams
  if (teams.length < 2) return [];
  
  // Need at least 4 teams to give each team 2 matches
  if (teams.length < 4) {
    console.warn(`Only ${teams.length} teams available. Need at least 4 teams to ensure 2 matches per team.`);
  }
  
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
  
  // Track how many matches each team has been assigned
  const teamMatchCounts = new Map<string, number>();
  teams.forEach(team => teamMatchCounts.set(team.id, 0));
  
  // Track used pairings to prevent rematches within the session
  const usedPairings = new Set<string>();
  const sessionMatchups = new Map<string, Set<string>>(); // Track all opponents for each team
  
  const finalPairings: TeamPairing[] = [];
  const targetMatchesPerTeam = 2;
  
  // Keep generating matches until all teams have 2 matches (or we can't find more valid pairings)
  let attempts = 0;
  const maxAttempts = potentialPairings.length * 2; // Prevent infinite loops
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // Check if all teams have reached the target
    const teamsNeedingMatches = teams.filter(team => 
      (teamMatchCounts.get(team.id) || 0) < targetMatchesPerTeam
    );
    
    if (teamsNeedingMatches.length === 0) break;
    if (teamsNeedingMatches.length === 1) {
      console.warn(`Only 1 team (${teamsNeedingMatches[0].name}) needs more matches. Cannot pair.`);
      break;
    }
    
    // Find the best available pairing
    let bestPairing: {team1: Team, team2: Team, score: number} | null = null;
    
    for (const pairing of potentialPairings) {
      const team1Count = teamMatchCounts.get(pairing.team1.id) || 0;
      const team2Count = teamMatchCounts.get(pairing.team2.id) || 0;
      
      // Skip if either team already has 2 matches
      if (team1Count >= targetMatchesPerTeam || team2Count >= targetMatchesPerTeam) continue;
      
      // Create a unique key for this pairing (order-independent)
      const pairingKey = [pairing.team1.id, pairing.team2.id].sort().join('-');
      
      // Skip if this pairing was already used (session-level rematch prevention)
      if (usedPairings.has(pairingKey)) {
        console.log(`Skipping session rematch: ${pairing.team1.name} vs ${pairing.team2.name}`);
        continue;
      }
      
      // Additional session-level opponent check
      const team1Opponents = sessionMatchups.get(pairing.team1.id) || new Set();
      const team2Opponents = sessionMatchups.get(pairing.team2.id) || new Set();
      
      if (team1Opponents.has(pairing.team2.id) || team2Opponents.has(pairing.team1.id)) {
        console.log(`Skipping duplicate opponent in session: ${pairing.team1.name} vs ${pairing.team2.name}`);
        continue;
      }
      
      // Check for rematches if avoiding them
      if (config.avoidRematches) {
        const hasPlayedBefore = await config.haveTeamsPlayedFn(pairing.team1.id, pairing.team2.id);
        if (hasPlayedBefore) continue;
      }
      
      // Prioritize pairings where both teams need matches
      const priority = (team1Count < targetMatchesPerTeam ? 1 : 0) + (team2Count < targetMatchesPerTeam ? 1 : 0);
      if (priority === 2) {
        bestPairing = pairing;
        break; // Found an ideal pairing where both teams need matches
      } else if (bestPairing === null && priority > 0) {
        bestPairing = pairing;
      }
    }
    
    if (!bestPairing) {
      console.warn('No more valid pairings available');
      break;
    }
    
    // Check for rematches one final time before adding
    const hasPlayedBefore = config.avoidRematches ? 
      await config.haveTeamsPlayedFn(bestPairing.team1.id, bestPairing.team2.id) : false;
    
    // Add the pairing
    finalPairings.push({
      team1: bestPairing.team1,
      team2: bestPairing.team2,
      compatibilityScore: bestPairing.score,
      hasPlayedBefore: hasPlayedBefore
    });
    
    // Update match counts
    teamMatchCounts.set(bestPairing.team1.id, (teamMatchCounts.get(bestPairing.team1.id) || 0) + 1);
    teamMatchCounts.set(bestPairing.team2.id, (teamMatchCounts.get(bestPairing.team2.id) || 0) + 1);
    
    // Mark this pairing as used
    const pairingKey = [bestPairing.team1.id, bestPairing.team2.id].sort().join('-');
    usedPairings.add(pairingKey);
    
    // Update session matchups tracking
    if (!sessionMatchups.has(bestPairing.team1.id)) {
      sessionMatchups.set(bestPairing.team1.id, new Set());
    }
    if (!sessionMatchups.has(bestPairing.team2.id)) {
      sessionMatchups.set(bestPairing.team2.id, new Set());
    }
    sessionMatchups.get(bestPairing.team1.id)!.add(bestPairing.team2.id);
    sessionMatchups.get(bestPairing.team2.id)!.add(bestPairing.team1.id);
  }
  
  // Log performance metrics and results
  const endTime = performance.now();
  console.log(`Pairing generation took ${(endTime - startTime).toFixed(2)}ms for ${teams.length} teams`);
  console.log(`Generated ${finalPairings.length} pairings`);
  
  // Log match distribution
  const matchDistribution = new Map<number, number>();
  teams.forEach(team => {
    const matchCount = teamMatchCounts.get(team.id) || 0;
    matchDistribution.set(matchCount, (matchDistribution.get(matchCount) || 0) + 1);
  });
  
  console.log('Match distribution:');
  matchDistribution.forEach((teamCount, matchCount) => {
    console.log(`  ${teamCount} teams with ${matchCount} matches`);
  });
  
  // Validate no session rematches occurred
  const validationResult = validateNoSessionRematches(finalPairings);
  if (validationResult.hasRematches) {
    console.error('Session rematch validation failed:', validationResult.rematches);
  } else {
    console.log('Session rematch validation passed: No duplicate opponents detected');
  }
  
  return finalPairings;
}

/**
 * Validate that no teams play each other more than once in the session
 */
function validateNoSessionRematches(pairings: TeamPairing[]): {
  hasRematches: boolean;
  rematches: string[];
} {
  const pairingCounts = new Map<string, number>();
  const rematches: string[] = [];
  
  pairings.forEach(pairing => {
    const key = [pairing.team1.id, pairing.team2.id].sort().join('-');
    const count = (pairingCounts.get(key) || 0) + 1;
    pairingCounts.set(key, count);
    
    if (count > 1) {
      rematches.push(`${pairing.team1.name} vs ${pairing.team2.name} (${count} times)`);
    }
  });
  
  return {
    hasRematches: rematches.length > 0,
    rematches
  };
}

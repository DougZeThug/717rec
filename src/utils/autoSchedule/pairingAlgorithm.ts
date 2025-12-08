import { Team } from "@/types";
import { TeamPairing } from "@/types/autoSchedule";
import { scheduleLog, debugLog, warnLog, errorLog } from "@/utils/logger";

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
 * Generate team pairings with backtracking to ensure each team gets exactly 2 matches
 */
export async function generatePairingsWithConfig(
  teams: Team[], 
  config: TeamPairingConfig
): Promise<TeamPairing[]> {
  // Return empty array for insufficient teams
  if (teams.length < 2) return [];
  
  // Mathematical validation
  const targetMatchesPerTeam = 2;
  const expectedMatches = teams.length; // For N teams, we need N matches (each team gets 2)
  
  scheduleLog(`Starting backtracking algorithm for ${teams.length} teams`);
  debugLog(`Expected to generate ${expectedMatches} matches (${targetMatchesPerTeam} per team)`);
  
  // Start tracking time for performance monitoring
  const startTime = performance.now();
  
  // Pre-calculate all potential pairings with scores and metadata
  const potentialPairings = await calculateAllPotentialPairings(teams, config);
  
  debugLog(`Generated ${potentialPairings.length} potential pairings`);
  
  // Use backtracking algorithm to find optimal solution
  const result = await findOptimalPairingsWithBacktracking(
    teams,
    potentialPairings,
    targetMatchesPerTeam,
    config
  );
  
  // Log performance metrics and results
  const endTime = performance.now();
  debugLog(`Backtracking algorithm took ${(endTime - startTime).toFixed(2)}ms`);
  debugLog(`Generated ${result.length} pairings (expected ${expectedMatches})`);
  
  // Log final statistics
  logFinalStatistics(teams, result, targetMatchesPerTeam);
  
  return result;
}

/**
 * Pre-calculate all potential pairings with compatibility scores and rematch status
 */
async function calculateAllPotentialPairings(
  teams: Team[],
  config: TeamPairingConfig
): Promise<Array<{
  team1: Team;
  team2: Team;
  score: number;
  hasPlayedBefore: boolean;
  pairingKey: string;
}>> {
  const potentialPairings = [];
  
  // Generate all possible pairs with metadata
  for (let i = 0; i < teams.length - 1; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i];
      const team2 = teams[j];
      
      // Calculate compatibility score
      const score = config.getCompatibilityScoreFn(team1, team2);
      
      // Check if teams have played before
      const hasPlayedBefore = config.avoidRematches ? 
        await config.haveTeamsPlayedFn(team1.id, team2.id) : false;
      
      // Create unique pairing key
      const pairingKey = [team1.id, team2.id].sort().join('-');
      
      potentialPairings.push({
        team1,
        team2,
        score,
        hasPlayedBefore,
        pairingKey
      });
    }
  }
  
  // Sort by priority: non-rematches first, then by compatibility score
  potentialPairings.sort((a, b) => {
    // Priority 1: Prefer non-rematches
    if (a.hasPlayedBefore !== b.hasPlayedBefore) {
      return a.hasPlayedBefore ? 1 : -1;
    }
    // Priority 2: Higher compatibility score
    return b.score - a.score;
  });
  
  return potentialPairings;
}

/**
 * Backtracking algorithm to find optimal pairing solution
 */
async function findOptimalPairingsWithBacktracking(
  teams: Team[],
  potentialPairings: Array<{
    team1: Team;
    team2: Team;
    score: number;
    hasPlayedBefore: boolean;
    pairingKey: string;
  }>,
  targetMatchesPerTeam: number,
  config: TeamPairingConfig
): Promise<TeamPairing[]> {
  // State management for backtracking
  const teamMatchCounts = new Map<string, number>();
  const usedPairings = new Set<string>();
  const sessionOpponents = new Map<string, Set<string>>();
  const finalPairings: TeamPairing[] = [];
  
  // Initialize team counts and opponent tracking
  teams.forEach(team => {
    teamMatchCounts.set(team.id, 0);
    sessionOpponents.set(team.id, new Set());
  });
  
  // Performance tracking
  let backtrackCount = 0;
  let exploredStates = 0;
  const maxBacktracks = 1000; // Prevent infinite recursion
  
  debugLog('Starting recursive backtracking...');
  
  /**
   * Recursive backtracking function
   */
  const backtrack = async (pairingIndex: number): Promise<boolean> => {
    exploredStates++;
    
    // Success condition: all teams have target matches
    const allTeamsComplete = teams.every(team => 
      (teamMatchCounts.get(team.id) || 0) === targetMatchesPerTeam
    );
    
    if (allTeamsComplete) {
      debugLog(`SUCCESS: Found complete solution with ${finalPairings.length} pairings`);
      return true;
    }
    
    // Base case: explored all pairings
    if (pairingIndex >= potentialPairings.length) {
      return false;
    }
    
    // Prevent infinite recursion
    if (backtrackCount > maxBacktracks) {
      warnLog(`Reached maximum backtrack limit (${maxBacktracks})`);
      return false;
    }
    
    // Try each remaining pairing
    for (let i = pairingIndex; i < potentialPairings.length; i++) {
      const pairing = potentialPairings[i];
      const { team1, team2, pairingKey, hasPlayedBefore } = pairing;
      
      // Check if this pairing is valid
      if (!isPairingValid(team1, team2, teamMatchCounts, usedPairings, 
                          sessionOpponents, pairingKey, targetMatchesPerTeam)) {
        continue;
      }
      
      // Apply the pairing (make the move)
      applyPairing(team1, team2, pairingKey, teamMatchCounts, usedPairings, 
                   sessionOpponents, finalPairings, pairing.score, hasPlayedBefore);
      
      debugLog(`Applied pairing: ${team1.name} vs ${team2.name} (${finalPairings.length} total)`);
      
      // Recursively try to complete the solution
      if (await backtrack(i + 1)) {
        return true; // Found a complete solution
      }
      
      // Backtrack: undo the pairing
      backtrackCount++;
      undoPairing(team1, team2, pairingKey, teamMatchCounts, usedPairings, 
                  sessionOpponents, finalPairings);
      
      debugLog(`Backtracked from: ${team1.name} vs ${team2.name} (attempt ${backtrackCount})`);
      
      // Yield control to prevent UI freezing
      if (backtrackCount % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return false; // No valid solution found from this state
  };
  
  // Start the backtracking process
  const success = await backtrack(0);
  
  debugLog(`Backtracking completed:`);
  debugLog(`- Success: ${success}`);
  debugLog(`- States explored: ${exploredStates}`);
  debugLog(`- Backtracks performed: ${backtrackCount}`);
  debugLog(`- Final pairings: ${finalPairings.length}`);
  
  // If backtracking failed to find perfect solution, try relaxed constraints
  if (!success || finalPairings.length < teams.length) {
    warnLog('Perfect solution not found, trying with relaxed constraints...');
    return await findRelaxedSolution(teams, potentialPairings, targetMatchesPerTeam);
  }
  
  return finalPairings;
}

/**
 * Check if a pairing is valid given current state
 */
function isPairingValid(
  team1: Team,
  team2: Team,
  teamMatchCounts: Map<string, number>,
  usedPairings: Set<string>,
  sessionOpponents: Map<string, Set<string>>,
  pairingKey: string,
  targetMatchesPerTeam: number
): boolean {
  const team1Count = teamMatchCounts.get(team1.id) || 0;
  const team2Count = teamMatchCounts.get(team2.id) || 0;
  
  // Both teams must not exceed target matches
  if (team1Count >= targetMatchesPerTeam || team2Count >= targetMatchesPerTeam) {
    return false;
  }
  
  // Cannot use the same pairing twice in session
  if (usedPairings.has(pairingKey)) {
    return false;
  }
  
  // Cannot have the same opponent twice in session
  const team1Opponents = sessionOpponents.get(team1.id) || new Set();
  const team2Opponents = sessionOpponents.get(team2.id) || new Set();
  
  if (team1Opponents.has(team2.id) || team2Opponents.has(team1.id)) {
    return false;
  }
  
  return true;
}

/**
 * Apply a pairing to the current state
 */
function applyPairing(
  team1: Team,
  team2: Team,
  pairingKey: string,
  teamMatchCounts: Map<string, number>,
  usedPairings: Set<string>,
  sessionOpponents: Map<string, Set<string>>,
  finalPairings: TeamPairing[],
  score: number,
  hasPlayedBefore: boolean
): void {
  // Update match counts
  teamMatchCounts.set(team1.id, (teamMatchCounts.get(team1.id) || 0) + 1);
  teamMatchCounts.set(team2.id, (teamMatchCounts.get(team2.id) || 0) + 1);
  
  // Mark pairing as used
  usedPairings.add(pairingKey);
  
  // Update opponent tracking
  sessionOpponents.get(team1.id)!.add(team2.id);
  sessionOpponents.get(team2.id)!.add(team1.id);
  
  // Add to final pairings
  finalPairings.push({
    team1,
    team2,
    compatibilityScore: score,
    hasPlayedBefore
  });
}

/**
 * Undo a pairing (backtrack)
 */
function undoPairing(
  team1: Team,
  team2: Team,
  pairingKey: string,
  teamMatchCounts: Map<string, number>,
  usedPairings: Set<string>,
  sessionOpponents: Map<string, Set<string>>,
  finalPairings: TeamPairing[]
): void {
  // Revert match counts
  teamMatchCounts.set(team1.id, (teamMatchCounts.get(team1.id) || 0) - 1);
  teamMatchCounts.set(team2.id, (teamMatchCounts.get(team2.id) || 0) - 1);
  
  // Remove pairing from used set
  usedPairings.delete(pairingKey);
  
  // Remove from opponent tracking
  sessionOpponents.get(team1.id)!.delete(team2.id);
  sessionOpponents.get(team2.id)!.delete(team1.id);
  
  // Remove from final pairings
  finalPairings.pop();
}

/**
 * Fallback algorithm with relaxed constraints when backtracking fails
 */
async function findRelaxedSolution(
  teams: Team[],
  potentialPairings: Array<{
    team1: Team;
    team2: Team;
    score: number;
    hasPlayedBefore: boolean;
    pairingKey: string;
  }>,
  targetMatchesPerTeam: number
): Promise<TeamPairing[]> {
  debugLog('Applying relaxed constraints: allowing rematches if necessary');
  
  const teamMatchCounts = new Map<string, number>();
  const usedPairings = new Set<string>();
  const finalPairings: TeamPairing[] = [];
  let rematchCount = 0;
  
  teams.forEach(team => teamMatchCounts.set(team.id, 0));
  
  // More aggressive approach: prioritize completing all teams
  for (const pairing of potentialPairings) {
    const team1Count = teamMatchCounts.get(pairing.team1.id) || 0;
    const team2Count = teamMatchCounts.get(pairing.team2.id) || 0;
    
    // Skip if either team is complete
    if (team1Count >= targetMatchesPerTeam || team2Count >= targetMatchesPerTeam) {
      continue;
    }
    
    // Allow session rematches in relaxed mode (but avoid if possible)
    if (usedPairings.has(pairing.pairingKey)) {
      continue;
    }
    
    // Add the pairing
    finalPairings.push({
      team1: pairing.team1,
      team2: pairing.team2,
      compatibilityScore: pairing.score,
      hasPlayedBefore: pairing.hasPlayedBefore
    });
    
    if (pairing.hasPlayedBefore) {
      rematchCount++;
    }
    
    // Update counts
    teamMatchCounts.set(pairing.team1.id, team1Count + 1);
    teamMatchCounts.set(pairing.team2.id, team2Count + 1);
    usedPairings.add(pairing.pairingKey);
    
    // Check if we're done
    const allComplete = teams.every(team => 
      (teamMatchCounts.get(team.id) || 0) === targetMatchesPerTeam
    );
    
    if (allComplete) {
      break;
    }
  }
  
  debugLog(`Relaxed solution: ${finalPairings.length} pairings with ${rematchCount} rematches`);
  return finalPairings;
}

/**
 * Log comprehensive statistics about the final result
 */
function logFinalStatistics(
  teams: Team[],
  finalPairings: TeamPairing[],
  targetMatchesPerTeam: number
): void {
  const teamMatchCounts = new Map<string, number>();
  teams.forEach(team => teamMatchCounts.set(team.id, 0));
  
  // Count matches per team
  finalPairings.forEach(pairing => {
    teamMatchCounts.set(pairing.team1.id, (teamMatchCounts.get(pairing.team1.id) || 0) + 1);
    teamMatchCounts.set(pairing.team2.id, (teamMatchCounts.get(pairing.team2.id) || 0) + 1);
  });
  
  // Analyze distribution
  const matchDistribution = new Map<number, number>();
  teams.forEach(team => {
    const matchCount = teamMatchCounts.get(team.id) || 0;
    matchDistribution.set(matchCount, (matchDistribution.get(matchCount) || 0) + 1);
  });
  
  debugLog('=== FINAL STATISTICS ===');
  debugLog(`Target matches per team: ${targetMatchesPerTeam}`);
  debugLog(`Total pairings generated: ${finalPairings.length}`);
  debugLog(`Expected pairings: ${teams.length}`);
  
  debugLog('Match distribution:');
  matchDistribution.forEach((teamCount, matchCount) => {
    const status = matchCount === targetMatchesPerTeam ? '✓' : '⚠️';
    debugLog(`  ${status} ${teamCount} teams with ${matchCount} matches`);
  });
  
  // Count rematches
  const rematchCount = finalPairings.filter(p => p.hasPlayedBefore).length;
  debugLog(`Rematches: ${rematchCount}/${finalPairings.length}`);
  
  // Validate session rematches
  const validationResult = validateNoSessionRematches(finalPairings);
  if (validationResult.hasRematches) {
    errorLog('⚠️ Session rematch validation failed:', validationResult.rematches);
  } else {
    debugLog('✓ No duplicate opponents in session');
  }
  
  debugLog('=== END STATISTICS ===');
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

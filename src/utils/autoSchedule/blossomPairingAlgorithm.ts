import edmondsBlossom from 'edmonds-blossom';

import { Team } from '@/types';
import { TeamPairing } from '@/types/autoSchedule';
import { debugLog, errorLog, scheduleLog, warnLog } from '@/utils/logger';
import { fetchSeasonHistoryForTeams } from './matchHistoryService';

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
    tierPenalty?: number;
  };
  playedPairsSet?: Set<string>; // Pre-fetched match history for performance
};

type Edge = {
  team1: Team;
  team2: Team;
  weight: number;
  hasPlayedBefore: boolean;
  pairingKey: string;
};

/**
 * Check if two teams have played before using the pre-fetched Set (synchronous)
 * Falls back to async function call if Set is not available
 */
function haveTeamsPlayedBeforeSync(
  team1Id: string,
  team2Id: string,
  config: TeamPairingConfig
): boolean {
  if (config.playedPairsSet) {
    const pairingKey = [team1Id, team2Id].sort().join('-');
    return config.playedPairsSet.has(pairingKey);
  }
  // Should not reach here if pre-fetch worked, but included for safety
  return false;
}

/**
 * Generate team pairings using Edmonds' Blossom algorithm for optimal maximum weight matching
 */
export async function generatePairingsWithBlossom(
  teams: Team[],
  config: TeamPairingConfig
): Promise<TeamPairing[]> {
  // Return empty array for insufficient teams
  if (teams.length < 2) return [];

  const targetMatchesPerTeam = 2;
  const expectedMatches = teams.length; // For N teams, we need N matches (each team gets 2)

  scheduleLog(`Starting Blossom algorithm for ${teams.length} teams`);
  debugLog(`Expected to generate ${expectedMatches} matches (${targetMatchesPerTeam} per team)`);

  const startTime = performance.now();

  try {
    // Pre-fetch match history once if not provided (avoids N+1 queries)
    if (!config.playedPairsSet && config.avoidRematches) {
      scheduleLog('Pre-fetching season history for all teams...');
      const teamIds = teams.map((team) => team.id);
      const historyPairs = await fetchSeasonHistoryForTeams(teamIds);

      // Build Set for O(1) lookup
      config.playedPairsSet = new Set<string>();
      historyPairs.forEach(([team1Id, team2Id]) => {
        const pairingKey = [team1Id, team2Id].sort().join('-');
        config.playedPairsSet!.add(pairingKey);
      });

      scheduleLog(`Loaded ${historyPairs.length} historical match pairs into memory`);
    }

    // Build weighted graph with all valid edges
    const edges = buildWeightedGraph(teams, config);
    debugLog(`Built graph with ${edges.length} valid edges`);

    // Run Blossom algorithm twice to ensure each team gets 2 matches
    const round1Pairings = runBlossomMatching(teams, edges, 1);
    const round2Pairings = runBlossomMatching(teams, filterUsedEdges(edges, round1Pairings), 2);

    // Combine results
    const allPairings = [...round1Pairings, ...round2Pairings];

    // Validate results
    validatePairings(teams, allPairings, targetMatchesPerTeam);

    const endTime = performance.now();
    debugLog(`Blossom algorithm took ${(endTime - startTime).toFixed(2)}ms`);

    // Log final statistics
    logFinalStatistics(teams, allPairings, targetMatchesPerTeam);

    return allPairings;
  } catch (error) {
    errorLog('Blossom algorithm failed:', error);

    // Fallback to relaxed solution
    warnLog('Falling back to relaxed constraints...');
    return await findRelaxedSolution(teams, config, targetMatchesPerTeam);
  }
}

/**
 * Build weighted graph with compatibility scores as edge weights
 * Apply hard constraints by excluding invalid edges
 */
function buildWeightedGraph(teams: Team[], config: TeamPairingConfig): Edge[] {
  const edges: Edge[] = [];

  // Generate all possible team pairs
  for (let i = 0; i < teams.length - 1; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i];
      const team2 = teams[j];

      // Apply hard constraints (exclude invalid edges)
      if (shouldExcludeEdge(team1, team2, config)) {
        continue;
      }

      // Calculate compatibility score (no bonus needed - score is already appropriate)
      const weight = config.getCompatibilityScoreFn(team1, team2);

      // Check if teams have played before (using pre-fetched Set for O(1) lookup)
      const hasPlayedBefore = config.avoidRematches
        ? haveTeamsPlayedBeforeSync(team1.id, team2.id, config)
        : false;

      const pairingKey = [team1.id, team2.id].sort().join('-');

      edges.push({
        team1,
        team2,
        weight,
        hasPlayedBefore,
        pairingKey,
      });
    }
  }

  return edges;
}

/**
 * Check if edge should be excluded based on hard constraints
 */
function shouldExcludeEdge(team1: Team, team2: Team, config: TeamPairingConfig): boolean {
  // Hard constraint: Block T1 vs T3 (extreme tier difference)
  if (isExtremeTierDifference(team1, team2)) {
    debugLog(`Blocking extreme tier difference: ${team1.name} vs ${team2.name}`);
    return true;
  }

  // Hard constraint: Block rematches (except T3 vs T3)
  if (config.avoidRematches) {
    const hasPlayedBefore = haveTeamsPlayedBeforeSync(team1.id, team2.id, config);
    if (hasPlayedBefore && !isBothRecreational(team1, team2)) {
      debugLog(`Blocking rematch: ${team1.name} vs ${team2.name}`);
      return true;
    }
  }

  return false;
}

/**
 * Check if teams are from extreme different tiers (T1 vs T3)
 */
function isExtremeTierDifference(team1: Team, team2: Team): boolean {
  const tier1 = getTierFromDivision(team1.divisionName);
  const tier2 = getTierFromDivision(team2.divisionName);

  const tierDistance = Math.abs(tier1 - tier2);
  return tierDistance >= 2; // Block T1 vs T3 (distance = 2)
}

/**
 * Check if both teams are recreational (T3)
 */
function isBothRecreational(team1: Team, team2: Team): boolean {
  const tier1 = getTierFromDivision(team1.divisionName);
  const tier2 = getTierFromDivision(team2.divisionName);

  return tier1 === 3 && tier2 === 3; // Both recreational
}

/**
 * Check if teams are from same tier
 */
function isSameTier(team1: Team, team2: Team): boolean {
  const tier1 = getTierFromDivision(team1.divisionName);
  const tier2 = getTierFromDivision(team2.divisionName);

  return tier1 === tier2;
}

/**
 * Extract tier number from division name
 */
function getTierFromDivision(divisionName: string | undefined): number {
  if (!divisionName) return 2; // Default to intermediate

  const lowerName = divisionName.toLowerCase();

  if (lowerName.includes('competitive') || lowerName.includes('comp')) {
    return 1; // Competitive
  } else if (lowerName.includes('recreational') || lowerName.includes('rec')) {
    return 3; // Recreational
  } else {
    return 2; // Intermediate (default)
  }
}

/**
 * Run Edmonds' Blossom algorithm for maximum weight matching
 */
function runBlossomMatching(teams: Team[], edges: Edge[], round: number): TeamPairing[] {
  debugLog(`Running Blossom matching round ${round} with ${edges.length} edges`);

  if (edges.length === 0) {
    warnLog(`No valid edges for round ${round}`);
    return [];
  }

  // Convert to format expected by edmonds-blossom
  // Create adjacency matrix with weights
  const teamIndexMap = new Map<string, number>();
  teams.forEach((team, index) => {
    teamIndexMap.set(team.id, index);
  });

  // Build adjacency matrix (negative weights because blossom finds minimum cost)
  const adjacencyMatrix: number[][] = [];
  for (let i = 0; i < teams.length; i++) {
    adjacencyMatrix[i] = new Array(teams.length).fill(0);
  }

  // Fill matrix with edge weights (negative for maximum weight matching)
  edges.forEach((edge) => {
    const index1 = teamIndexMap.get(edge.team1.id)!;
    const index2 = teamIndexMap.get(edge.team2.id)!;
    const weight = -edge.weight; // Negative because blossom finds minimum cost

    adjacencyMatrix[index1][index2] = weight;
    adjacencyMatrix[index2][index1] = weight;
  });

  try {
    // Run Blossom algorithm
    const matching = edmondsBlossom(adjacencyMatrix);

    // Convert matching result back to TeamPairing objects
    const pairings: TeamPairing[] = [];
    const edgeMap = createEdgeMap(edges);

    for (let i = 0; i < matching.length; i++) {
      const partnerIndex = matching[i];

      // Skip if no partner or already processed this pair
      if (partnerIndex === -1 || i >= partnerIndex) {
        continue;
      }

      const team1 = teams[i];
      const team2 = teams[partnerIndex];
      const pairingKey = [team1.id, team2.id].sort().join('-');
      const edge = edgeMap.get(pairingKey);

      if (edge) {
        pairings.push({
          team1,
          team2,
          compatibilityScore: edge.weight,
          hasPlayedBefore: edge.hasPlayedBefore,
        });

        debugLog(
          `Round ${round}: ${team1.name} vs ${team2.name} (score: ${edge.weight.toFixed(1)})`
        );
      }
    }

    debugLog(`Round ${round} completed: ${pairings.length} pairings`);
    return pairings;
  } catch (error) {
    errorLog(`Blossom matching failed for round ${round}:`, error);
    return [];
  }
}

/**
 * Create a map for quick edge lookup
 */
function createEdgeMap(edges: Edge[]): Map<string, Edge> {
  const edgeMap = new Map<string, Edge>();
  edges.forEach((edge) => {
    edgeMap.set(edge.pairingKey, edge);
  });
  return edgeMap;
}

/**
 * Remove edges that have already been used in previous rounds
 */
function filterUsedEdges(edges: Edge[], usedPairings: TeamPairing[]): Edge[] {
  const usedTeamPairs = new Set<string>();

  // Mark all team pairs that have already been matched
  usedPairings.forEach((pairing) => {
    const pairingKey = [pairing.team1.id, pairing.team2.id].sort().join('-');
    usedTeamPairs.add(pairingKey);
  });

  // Filter out used edges
  return edges.filter((edge) => !usedTeamPairs.has(edge.pairingKey));
}

/**
 * Validate that each team gets exactly the target number of matches
 */
function validatePairings(
  teams: Team[],
  pairings: TeamPairing[],
  targetMatchesPerTeam: number
): void {
  const teamMatchCounts = new Map<string, number>();
  teams.forEach((team) => teamMatchCounts.set(team.id, 0));

  // Count matches per team
  pairings.forEach((pairing) => {
    teamMatchCounts.set(pairing.team1.id, (teamMatchCounts.get(pairing.team1.id) || 0) + 1);
    teamMatchCounts.set(pairing.team2.id, (teamMatchCounts.get(pairing.team2.id) || 0) + 1);
  });

  // Check for teams with incorrect match counts
  const incorrectTeams = teams.filter(
    (team) => (teamMatchCounts.get(team.id) || 0) !== targetMatchesPerTeam
  );

  if (incorrectTeams.length > 0) {
    warnLog(
      'Teams with incorrect match counts:',
      incorrectTeams.map((team) => `${team.name}: ${teamMatchCounts.get(team.id) || 0} matches`)
    );
    throw new Error(`${incorrectTeams.length} teams don't have ${targetMatchesPerTeam} matches`);
  }

  // Validate no session rematches
  const sessionRematches = validateNoSessionRematches(pairings);
  if (sessionRematches.hasRematches) {
    throw new Error(`Session rematches detected: ${sessionRematches.rematches.join(', ')}`);
  }
}

/**
 * Fallback algorithm with relaxed constraints when Blossom fails
 */
async function findRelaxedSolution(
  teams: Team[],
  config: TeamPairingConfig,
  targetMatchesPerTeam: number
): Promise<TeamPairing[]> {
  debugLog('Applying relaxed constraints: allowing rematches if necessary');

  const edges = buildRelaxedGraph(teams, config);
  const teamMatchCounts = new Map<string, number>();
  const usedPairings = new Set<string>();
  const finalPairings: TeamPairing[] = [];

  teams.forEach((team) => teamMatchCounts.set(team.id, 0));

  // Sort edges by weight (descending)
  edges.sort((a, b) => b.weight - a.weight);

  // Greedy assignment with relaxed constraints
  for (const edge of edges) {
    const team1Count = teamMatchCounts.get(edge.team1.id) || 0;
    const team2Count = teamMatchCounts.get(edge.team2.id) || 0;

    // Skip if either team is complete
    if (team1Count >= targetMatchesPerTeam || team2Count >= targetMatchesPerTeam) {
      continue;
    }

    // Skip if pairing already used
    if (usedPairings.has(edge.pairingKey)) {
      continue;
    }

    // Add the pairing
    finalPairings.push({
      team1: edge.team1,
      team2: edge.team2,
      compatibilityScore: edge.weight,
      hasPlayedBefore: edge.hasPlayedBefore,
    });

    teamMatchCounts.set(edge.team1.id, team1Count + 1);
    teamMatchCounts.set(edge.team2.id, team2Count + 1);
    usedPairings.add(edge.pairingKey);

    // Check if we're done
    const allComplete = teams.every(
      (team) => (teamMatchCounts.get(team.id) || 0) === targetMatchesPerTeam
    );

    if (allComplete) {
      break;
    }
  }

  debugLog(`Relaxed solution: ${finalPairings.length} pairings`);
  return finalPairings;
}

/**
 * Build graph with very relaxed constraints for fallback
 */
function buildRelaxedGraph(teams: Team[], config: TeamPairingConfig): Edge[] {
  const edges: Edge[] = [];

  for (let i = 0; i < teams.length - 1; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i];
      const team2 = teams[j];

      // Only block extreme tier differences in relaxed mode
      if (isExtremeTierDifference(team1, team2)) {
        continue;
      }

      const weight = config.getCompatibilityScoreFn(team1, team2);
      const hasPlayedBefore = config.avoidRematches
        ? haveTeamsPlayedBeforeSync(team1.id, team2.id, config)
        : false;

      const pairingKey = [team1.id, team2.id].sort().join('-');

      edges.push({
        team1,
        team2,
        weight,
        hasPlayedBefore,
        pairingKey,
      });
    }
  }

  return edges;
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
  teams.forEach((team) => teamMatchCounts.set(team.id, 0));

  // Count matches per team
  finalPairings.forEach((pairing) => {
    teamMatchCounts.set(pairing.team1.id, (teamMatchCounts.get(pairing.team1.id) || 0) + 1);
    teamMatchCounts.set(pairing.team2.id, (teamMatchCounts.get(pairing.team2.id) || 0) + 1);
  });

  // Analyze distribution
  const matchDistribution = new Map<number, number>();
  teams.forEach((team) => {
    const matchCount = teamMatchCounts.get(team.id) || 0;
    matchDistribution.set(matchCount, (matchDistribution.get(matchCount) || 0) + 1);
  });

  debugLog('=== BLOSSOM ALGORITHM STATISTICS ===');
  debugLog(`Target matches per team: ${targetMatchesPerTeam}`);
  debugLog(`Total pairings generated: ${finalPairings.length}`);
  debugLog(`Expected pairings: ${teams.length}`);

  debugLog('Match distribution:');
  matchDistribution.forEach((teamCount, matchCount) => {
    const status = matchCount === targetMatchesPerTeam ? '✓' : '⚠️';
    debugLog(`  ${status} ${teamCount} teams with ${matchCount} matches`);
  });

  // Count rematches
  const rematchCount = finalPairings.filter((p) => p.hasPlayedBefore).length;
  debugLog(`Rematches: ${rematchCount}/${finalPairings.length}`);

  // Calculate average compatibility score
  const avgScore =
    finalPairings.reduce((sum, p) => sum + p.compatibilityScore, 0) / finalPairings.length;
  debugLog(`Average compatibility score: ${avgScore.toFixed(2)}`);

  // Analyze tier distribution
  const tierPairings = new Map<string, number>();
  finalPairings.forEach((pairing) => {
    const tier1 = getTierFromDivision(pairing.team1.divisionName);
    const tier2 = getTierFromDivision(pairing.team2.divisionName);
    const tierKey =
      tier1 === tier2
        ? `T${tier1}-T${tier2}`
        : `T${Math.min(tier1, tier2)}-T${Math.max(tier1, tier2)}`;
    tierPairings.set(tierKey, (tierPairings.get(tierKey) || 0) + 1);
  });

  debugLog('Tier distribution:');
  tierPairings.forEach((count, tierKey) => {
    debugLog(`  ${tierKey}: ${count} pairings`);
  });

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

  pairings.forEach((pairing) => {
    const key = [pairing.team1.id, pairing.team2.id].sort().join('-');
    const count = (pairingCounts.get(key) || 0) + 1;
    pairingCounts.set(key, count);

    if (count > 1) {
      rematches.push(`${pairing.team1.name} vs ${pairing.team2.name} (${count} times)`);
    }
  });

  return {
    hasRematches: rematches.length > 0,
    rematches,
  };
}

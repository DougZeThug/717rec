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
 * Constraint relaxation levels for progressive fallback
 */
type RelaxationLevel = 0 | 1 | 2 | 3;

/**
 * Analysis of a team's available edges in the graph
 */
type TeamEdgeAnalysis = {
  teamId: string;
  teamName: string;
  tier: number;
  totalEdges: number;
  edgesBlockedByTier: number;
  edgesBlockedByRematch: number;
  availableEdges: number;
  isAtRisk: boolean; // Has fewer than 2 available edges
  uniqueOpponentIds: string[];
};

/**
 * Result of graph feasibility analysis
 */
type GraphFeasibilityResult = {
  isFeasible: boolean;
  atRiskTeams: TeamEdgeAnalysis[];
  recommendedRelaxation: RelaxationLevel;
  analysis: Map<string, TeamEdgeAnalysis>;
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
 * Analyze graph feasibility to determine if a 2-match solution is possible
 * This pre-validates the graph before running Blossom to detect constraint issues early
 */
function analyzeGraphFeasibility(
  teams: Team[],
  config: TeamPairingConfig,
  relaxationLevel: RelaxationLevel = 0
): GraphFeasibilityResult {
  const analysis = new Map<string, TeamEdgeAnalysis>();
  const targetMatchesPerTeam = 2;

  // Initialize analysis for each team
  teams.forEach((team) => {
    analysis.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      tier: getTierFromDivision(team.divisionName),
      totalEdges: 0,
      edgesBlockedByTier: 0,
      edgesBlockedByRematch: 0,
      availableEdges: 0,
      isAtRisk: false,
      uniqueOpponentIds: [],
    });
  });

  // Count edges for each team
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i];
      const team2 = teams[j];
      const team1Analysis = analysis.get(team1.id)!;
      const team2Analysis = analysis.get(team2.id)!;

      team1Analysis.totalEdges++;
      team2Analysis.totalEdges++;

      // Check tier constraint (with relaxation support)
      const tierBlocked =
        relaxationLevel < 2 && isExtremeTierDifference(team1, team2);

      if (tierBlocked) {
        team1Analysis.edgesBlockedByTier++;
        team2Analysis.edgesBlockedByTier++;
        continue;
      }

      // Check rematch constraint (with relaxation support)
      const hasPlayedBefore =
        config.avoidRematches && haveTeamsPlayedBeforeSync(team1.id, team2.id, config);
      const rematchBlocked =
        relaxationLevel < 1 && hasPlayedBefore && !isBothRecreational(team1, team2);

      if (rematchBlocked) {
        team1Analysis.edgesBlockedByRematch++;
        team2Analysis.edgesBlockedByRematch++;
        continue;
      }

      // Edge is available
      team1Analysis.availableEdges++;
      team2Analysis.availableEdges++;
      team1Analysis.uniqueOpponentIds.push(team2.id);
      team2Analysis.uniqueOpponentIds.push(team1.id);
    }
  }

  // Identify at-risk teams (fewer than targetMatchesPerTeam available edges)
  const atRiskTeams: TeamEdgeAnalysis[] = [];
  analysis.forEach((teamAnalysis) => {
    teamAnalysis.isAtRisk = teamAnalysis.availableEdges < targetMatchesPerTeam;
    if (teamAnalysis.isAtRisk) {
      atRiskTeams.push(teamAnalysis);
    }
  });

  // Determine recommended relaxation level
  let recommendedRelaxation: RelaxationLevel = 0;
  if (atRiskTeams.length > 0) {
    // Check if relaxing rematches would help
    const rematchBlockedTeams = atRiskTeams.filter((t) => t.edgesBlockedByRematch > 0);
    if (rematchBlockedTeams.length > 0) {
      recommendedRelaxation = 1;
    }

    // Check if we also need to relax tier constraints
    const stillAtRiskAfterRematch = atRiskTeams.filter(
      (t) => t.availableEdges + t.edgesBlockedByRematch < targetMatchesPerTeam
    );
    if (stillAtRiskAfterRematch.length > 0) {
      const tierBlockedTeams = stillAtRiskAfterRematch.filter((t) => t.edgesBlockedByTier > 0);
      if (tierBlockedTeams.length > 0) {
        recommendedRelaxation = 2;
      }
    }

    // If still not enough, need full relaxation
    const stillAtRiskAfterBoth = atRiskTeams.filter(
      (t) =>
        t.availableEdges + t.edgesBlockedByRematch + t.edgesBlockedByTier < targetMatchesPerTeam
    );
    if (stillAtRiskAfterBoth.length > 0) {
      recommendedRelaxation = 3;
    }
  }

  // Log analysis results
  if (atRiskTeams.length > 0) {
    warnLog(`Graph feasibility analysis found ${atRiskTeams.length} at-risk teams:`);
    atRiskTeams.forEach((t) => {
      warnLog(
        `  ${t.teamName} (T${t.tier}): ${t.availableEdges} edges available ` +
          `(${t.edgesBlockedByTier} blocked by tier, ${t.edgesBlockedByRematch} blocked by rematch)`
      );
    });
    warnLog(`Recommended relaxation level: ${recommendedRelaxation}`);
  }

  return {
    isFeasible: atRiskTeams.length === 0,
    atRiskTeams,
    recommendedRelaxation,
    analysis,
  };
}

/**
 * Build edges with selective constraint relaxation for specific at-risk teams
 */
function buildWeightedGraphWithRelaxation(
  teams: Team[],
  config: TeamPairingConfig,
  atRiskTeamIds: Set<string>,
  relaxationLevel: RelaxationLevel
): Edge[] {
  const edges: Edge[] = [];

  for (let i = 0; i < teams.length - 1; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i];
      const team2 = teams[j];

      // Check if either team is at-risk (needs relaxed constraints)
      const involvesAtRiskTeam = atRiskTeamIds.has(team1.id) || atRiskTeamIds.has(team2.id);

      // Apply constraints based on relaxation level for at-risk teams
      const effectiveRelaxation = involvesAtRiskTeam ? relaxationLevel : 0;

      // Tier constraint check
      if (effectiveRelaxation < 2 && isExtremeTierDifference(team1, team2)) {
        continue;
      }

      // Rematch constraint check
      const hasPlayedBefore =
        config.avoidRematches && haveTeamsPlayedBeforeSync(team1.id, team2.id, config);
      if (
        effectiveRelaxation < 1 &&
        hasPlayedBefore &&
        !isBothRecreational(team1, team2)
      ) {
        continue;
      }

      const weight = config.getCompatibilityScoreFn(team1, team2);
      const pairingKey = [team1.id, team2.id].sort().join('-');

      // Apply penalty for relaxed constraints (lower priority than normal matches)
      let adjustedWeight = weight;
      if (hasPlayedBefore && effectiveRelaxation >= 1) {
        adjustedWeight -= 50; // Penalty for rematches
      }
      if (isExtremeTierDifference(team1, team2) && effectiveRelaxation >= 2) {
        adjustedWeight -= 100; // Larger penalty for T1 vs T3
      }

      edges.push({
        team1,
        team2,
        weight: adjustedWeight,
        hasPlayedBefore: hasPlayedBefore || false,
        pairingKey,
      });
    }
  }

  return edges;
}

/**
 * Repair unmatched teams after a round by finding available partners
 * Uses greedy matching to fill gaps left by Blossom
 */
function repairUnmatchedTeams(
  teams: Team[],
  existingPairings: TeamPairing[],
  edges: Edge[],
  targetMatchesPerTeam: number
): TeamPairing[] {
  // Count current matches per team
  const teamMatchCounts = new Map<string, number>();
  teams.forEach((team) => teamMatchCounts.set(team.id, 0));

  existingPairings.forEach((pairing) => {
    teamMatchCounts.set(pairing.team1.id, (teamMatchCounts.get(pairing.team1.id) || 0) + 1);
    teamMatchCounts.set(pairing.team2.id, (teamMatchCounts.get(pairing.team2.id) || 0) + 1);
  });

  // Find teams needing more matches
  const teamsNeedingMatches = teams.filter(
    (team) => (teamMatchCounts.get(team.id) || 0) < targetMatchesPerTeam
  );

  if (teamsNeedingMatches.length === 0) {
    return existingPairings;
  }

  debugLog(`Repairing ${teamsNeedingMatches.length} teams with insufficient matches`);

  // Track used pairings
  const usedPairings = new Set<string>();
  existingPairings.forEach((p) => {
    usedPairings.add([p.team1.id, p.team2.id].sort().join('-'));
  });

  // Create edge lookup
  const edgeMap = new Map<string, Edge>();
  edges.forEach((edge) => edgeMap.set(edge.pairingKey, edge));

  // Sort teams needing matches by how many they still need (descending)
  teamsNeedingMatches.sort((a, b) => {
    const aNeeds = targetMatchesPerTeam - (teamMatchCounts.get(a.id) || 0);
    const bNeeds = targetMatchesPerTeam - (teamMatchCounts.get(b.id) || 0);
    return bNeeds - aNeeds;
  });

  const additionalPairings: TeamPairing[] = [];

  // Try to match teams greedily
  for (const team of teamsNeedingMatches) {
    const currentMatches = teamMatchCounts.get(team.id) || 0;
    const matchesNeeded = targetMatchesPerTeam - currentMatches;

    if (matchesNeeded <= 0) continue;

    // Find available partners for this team
    const availablePartners = teams.filter((partner) => {
      if (partner.id === team.id) return false;
      const partnerMatches = teamMatchCounts.get(partner.id) || 0;
      if (partnerMatches >= targetMatchesPerTeam) return false;

      const pairingKey = [team.id, partner.id].sort().join('-');
      if (usedPairings.has(pairingKey)) return false;
      if (!edgeMap.has(pairingKey)) return false;

      return true;
    });

    // Sort partners by compatibility score
    availablePartners.sort((a, b) => {
      const keyA = [team.id, a.id].sort().join('-');
      const keyB = [team.id, b.id].sort().join('-');
      const edgeA = edgeMap.get(keyA);
      const edgeB = edgeMap.get(keyB);
      return (edgeB?.weight || 0) - (edgeA?.weight || 0);
    });

    // Match with best available partners
    for (const partner of availablePartners) {
      if ((teamMatchCounts.get(team.id) || 0) >= targetMatchesPerTeam) break;
      if ((teamMatchCounts.get(partner.id) || 0) >= targetMatchesPerTeam) continue;

      const pairingKey = [team.id, partner.id].sort().join('-');
      const edge = edgeMap.get(pairingKey);

      if (edge) {
        additionalPairings.push({
          team1: edge.team1,
          team2: edge.team2,
          compatibilityScore: edge.weight,
          hasPlayedBefore: edge.hasPlayedBefore,
        });

        usedPairings.add(pairingKey);
        teamMatchCounts.set(team.id, (teamMatchCounts.get(team.id) || 0) + 1);
        teamMatchCounts.set(partner.id, (teamMatchCounts.get(partner.id) || 0) + 1);

        debugLog(`Repair: ${edge.team1.name} vs ${edge.team2.name}`);
      }
    }
  }

  return [...existingPairings, ...additionalPairings];
}

/**
 * Generate team pairings using Edmonds' Blossom algorithm for optimal maximum weight matching
 * Enhanced with pre-validation, constraint relaxation, and repair mechanisms to ensure
 * every team gets exactly 2 matches.
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

    // STEP 1: Analyze graph feasibility before running Blossom
    const feasibilityResult = analyzeGraphFeasibility(teams, config, 0);

    let edges: Edge[];
    let atRiskTeamIds = new Set<string>();
    let relaxationLevel: RelaxationLevel = 0;

    if (!feasibilityResult.isFeasible) {
      // Some teams don't have enough valid edges - apply targeted relaxation
      relaxationLevel = feasibilityResult.recommendedRelaxation;
      atRiskTeamIds = new Set(feasibilityResult.atRiskTeams.map((t) => t.teamId));

      scheduleLog(
        `Applying relaxation level ${relaxationLevel} for ${atRiskTeamIds.size} at-risk teams`
      );

      // Build graph with relaxed constraints for at-risk teams
      edges = buildWeightedGraphWithRelaxation(teams, config, atRiskTeamIds, relaxationLevel);
    } else {
      // Build standard weighted graph
      edges = buildWeightedGraph(teams, config);
    }

    debugLog(`Built graph with ${edges.length} valid edges`);

    // STEP 2: Run Blossom algorithm for Round 1
    const round1Pairings = runBlossomMatching(teams, edges, 1);

    // STEP 3: Filter edges and run Round 2
    const round2Edges = filterUsedEdges(edges, round1Pairings);
    let round2Pairings = runBlossomMatching(teams, round2Edges, 2);

    // Combine results
    let allPairings = [...round1Pairings, ...round2Pairings];

    // STEP 4: Check if any teams are missing matches and repair
    const teamMatchCounts = countTeamMatches(teams, allPairings);
    const teamsNeedingRepair = teams.filter(
      (t) => (teamMatchCounts.get(t.id) || 0) < targetMatchesPerTeam
    );

    if (teamsNeedingRepair.length > 0) {
      debugLog(`${teamsNeedingRepair.length} teams need repair after Blossom rounds`);

      // If we haven't relaxed yet, try with relaxation first
      if (relaxationLevel === 0) {
        // Re-analyze with relaxation to get more edges
        const relaxedFeasibility = analyzeGraphFeasibility(teams, config, 1);
        if (relaxedFeasibility.recommendedRelaxation > 0) {
          relaxationLevel = relaxedFeasibility.recommendedRelaxation;
          const needsRelaxation = new Set(teamsNeedingRepair.map((t) => t.id));

          // Rebuild edges with relaxation for teams that need it
          edges = buildWeightedGraphWithRelaxation(teams, config, needsRelaxation, relaxationLevel);
          debugLog(`Rebuilt graph with ${edges.length} edges (relaxation level ${relaxationLevel})`);
        }
      }

      // Repair unmatched teams using greedy matching
      allPairings = repairUnmatchedTeams(teams, allPairings, edges, targetMatchesPerTeam);
    }

    // STEP 5: Final validation with enhanced feedback
    try {
      validatePairings(teams, allPairings, targetMatchesPerTeam);
    } catch (validationError) {
      // If validation fails, try one more repair pass with full relaxation
      warnLog('Validation failed, attempting final repair with full relaxation...');

      const fullRelaxationEdges = buildWeightedGraphWithRelaxation(
        teams,
        config,
        new Set(teams.map((t) => t.id)),
        3
      );

      allPairings = repairUnmatchedTeams(
        teams,
        allPairings,
        fullRelaxationEdges,
        targetMatchesPerTeam
      );

      // Try validation again - this time let it throw if it fails
      validatePairingsWithDetails(teams, allPairings, targetMatchesPerTeam, config);
    }

    const endTime = performance.now();
    debugLog(`Blossom algorithm took ${(endTime - startTime).toFixed(2)}ms`);

    // Log final statistics
    logFinalStatistics(teams, allPairings, targetMatchesPerTeam);

    return allPairings;
  } catch (error) {
    errorLog('Blossom algorithm failed:', error);

    // Fallback to relaxed solution with guaranteed matching
    warnLog('Falling back to guaranteed matching solution...');
    return await findGuaranteedSolution(teams, config, targetMatchesPerTeam);
  }
}

/**
 * Count matches per team from pairings
 */
function countTeamMatches(teams: Team[], pairings: TeamPairing[]): Map<string, number> {
  const counts = new Map<string, number>();
  teams.forEach((team) => counts.set(team.id, 0));

  pairings.forEach((pairing) => {
    counts.set(pairing.team1.id, (counts.get(pairing.team1.id) || 0) + 1);
    counts.set(pairing.team2.id, (counts.get(pairing.team2.id) || 0) + 1);
  });

  return counts;
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
 * Enhanced validation with detailed feedback about why teams are unmatched
 */
function validatePairingsWithDetails(
  teams: Team[],
  pairings: TeamPairing[],
  targetMatchesPerTeam: number,
  config: TeamPairingConfig
): void {
  const teamMatchCounts = new Map<string, number>();
  teams.forEach((team) => teamMatchCounts.set(team.id, 0));

  pairings.forEach((pairing) => {
    teamMatchCounts.set(pairing.team1.id, (teamMatchCounts.get(pairing.team1.id) || 0) + 1);
    teamMatchCounts.set(pairing.team2.id, (teamMatchCounts.get(pairing.team2.id) || 0) + 1);
  });

  const incorrectTeams = teams.filter(
    (team) => (teamMatchCounts.get(team.id) || 0) !== targetMatchesPerTeam
  );

  if (incorrectTeams.length > 0) {
    // Provide detailed analysis of why each team couldn't be matched
    const details: string[] = [];

    incorrectTeams.forEach((team) => {
      const matchCount = teamMatchCounts.get(team.id) || 0;
      const tier = getTierFromDivision(team.divisionName);

      // Analyze constraints blocking this team
      let tierBlockedCount = 0;
      let rematchBlockedCount = 0;
      let availableCount = 0;

      teams.forEach((other) => {
        if (other.id === team.id) return;

        if (isExtremeTierDifference(team, other)) {
          tierBlockedCount++;
        } else if (
          config.avoidRematches &&
          haveTeamsPlayedBeforeSync(team.id, other.id, config) &&
          !isBothRecreational(team, other)
        ) {
          rematchBlockedCount++;
        } else {
          availableCount++;
        }
      });

      details.push(
        `${team.name} (T${tier}): ${matchCount}/${targetMatchesPerTeam} matches. ` +
          `Available opponents: ${availableCount}, blocked by tier: ${tierBlockedCount}, ` +
          `blocked by rematch: ${rematchBlockedCount}`
      );
    });

    errorLog('VALIDATION FAILED - Detailed team analysis:');
    details.forEach((d) => errorLog(`  ${d}`));

    throw new Error(
      `${incorrectTeams.length} teams don't have ${targetMatchesPerTeam} matches. ` +
        `Details: ${details.slice(0, 3).join('; ')}${details.length > 3 ? '...' : ''}`
    );
  }

  // Validate no session rematches
  const sessionRematches = validateNoSessionRematches(pairings);
  if (sessionRematches.hasRematches) {
    throw new Error(`Session rematches detected: ${sessionRematches.rematches.join(', ')}`);
  }
}

/**
 * Guaranteed matching solution that uses progressive constraint relaxation
 * and prioritizes teams with fewer options
 */
async function findGuaranteedSolution(
  teams: Team[],
  config: TeamPairingConfig,
  targetMatchesPerTeam: number
): Promise<TeamPairing[]> {
  scheduleLog('Using guaranteed matching solution with progressive constraint relaxation');

  const teamMatchCounts = new Map<string, number>();
  const usedPairings = new Set<string>();
  const finalPairings: TeamPairing[] = [];

  teams.forEach((team) => teamMatchCounts.set(team.id, 0));

  // Try each relaxation level progressively
  for (let relaxLevel = 0 as RelaxationLevel; relaxLevel <= 3; relaxLevel++) {
    // Build edges with current relaxation level
    const edges = buildEdgesWithRelaxationLevel(teams, config, relaxLevel);

    // Create edge map for quick lookup
    const edgeMap = new Map<string, Edge>();
    edges.forEach((edge) => edgeMap.set(edge.pairingKey, edge));

    // Sort teams by how many matches they still need (prioritize those needing more)
    // Then by how many available options they have (prioritize those with fewer options)
    const teamPriority = teams
      .map((team) => {
        const matchesNeeded = targetMatchesPerTeam - (teamMatchCounts.get(team.id) || 0);
        const availableEdges = edges.filter((e) => {
          if (usedPairings.has(e.pairingKey)) return false;
          const isTeam1 = e.team1.id === team.id;
          const isTeam2 = e.team2.id === team.id;
          if (!isTeam1 && !isTeam2) return false;
          const partnerId = isTeam1 ? e.team2.id : e.team1.id;
          const partnerMatches = teamMatchCounts.get(partnerId) || 0;
          return partnerMatches < targetMatchesPerTeam;
        }).length;

        return { team, matchesNeeded, availableEdges };
      })
      .filter((t) => t.matchesNeeded > 0)
      .sort((a, b) => {
        // First prioritize teams needing more matches
        if (a.matchesNeeded !== b.matchesNeeded) return b.matchesNeeded - a.matchesNeeded;
        // Then prioritize teams with fewer options (they're harder to match)
        return a.availableEdges - b.availableEdges;
      });

    // Try to match each team
    for (const { team, matchesNeeded } of teamPriority) {
      if ((teamMatchCounts.get(team.id) || 0) >= targetMatchesPerTeam) continue;

      // Find available partners for this team
      const availablePartners = teams
        .filter((partner) => {
          if (partner.id === team.id) return false;
          if ((teamMatchCounts.get(partner.id) || 0) >= targetMatchesPerTeam) return false;
          const pairingKey = [team.id, partner.id].sort().join('-');
          if (usedPairings.has(pairingKey)) return false;
          if (!edgeMap.has(pairingKey)) return false;
          return true;
        })
        .map((partner) => ({
          partner,
          edge: edgeMap.get([team.id, partner.id].sort().join('-'))!,
          partnerOptions: edges.filter((e) => {
            if (usedPairings.has(e.pairingKey)) return false;
            const isPartner = e.team1.id === partner.id || e.team2.id === partner.id;
            if (!isPartner) return false;
            const otherId = e.team1.id === partner.id ? e.team2.id : e.team1.id;
            return (teamMatchCounts.get(otherId) || 0) < targetMatchesPerTeam;
          }).length,
        }))
        // Prioritize partners with fewer remaining options (help constrained teams first)
        // Then by edge weight (compatibility score)
        .sort((a, b) => {
          if (a.partnerOptions !== b.partnerOptions) return a.partnerOptions - b.partnerOptions;
          return b.edge.weight - a.edge.weight;
        });

      // Match with available partners
      for (const { partner, edge } of availablePartners) {
        if ((teamMatchCounts.get(team.id) || 0) >= targetMatchesPerTeam) break;
        if ((teamMatchCounts.get(partner.id) || 0) >= targetMatchesPerTeam) continue;

        finalPairings.push({
          team1: edge.team1,
          team2: edge.team2,
          compatibilityScore: edge.weight,
          hasPlayedBefore: edge.hasPlayedBefore,
        });

        usedPairings.add(edge.pairingKey);
        teamMatchCounts.set(team.id, (teamMatchCounts.get(team.id) || 0) + 1);
        teamMatchCounts.set(partner.id, (teamMatchCounts.get(partner.id) || 0) + 1);
      }
    }

    // Check if all teams are satisfied
    const allComplete = teams.every(
      (team) => (teamMatchCounts.get(team.id) || 0) === targetMatchesPerTeam
    );

    if (allComplete) {
      scheduleLog(`Guaranteed solution found at relaxation level ${relaxLevel}`);
      break;
    }

    if (relaxLevel < 3) {
      debugLog(
        `Relaxation level ${relaxLevel} incomplete, trying level ${relaxLevel + 1}...`
      );
    }
  }

  // Log final state
  const teamsWithIncorrectMatches = teams.filter(
    (t) => (teamMatchCounts.get(t.id) || 0) !== targetMatchesPerTeam
  );

  if (teamsWithIncorrectMatches.length > 0) {
    warnLog(
      `Guaranteed solution still has ${teamsWithIncorrectMatches.length} teams with incorrect match counts:`
    );
    teamsWithIncorrectMatches.forEach((t) => {
      warnLog(`  ${t.name}: ${teamMatchCounts.get(t.id) || 0}/${targetMatchesPerTeam} matches`);
    });
  }

  scheduleLog(`Guaranteed solution: ${finalPairings.length} pairings generated`);
  return finalPairings;
}

/**
 * Build edges with a specific relaxation level applied to ALL teams
 */
function buildEdgesWithRelaxationLevel(
  teams: Team[],
  config: TeamPairingConfig,
  relaxationLevel: RelaxationLevel
): Edge[] {
  const edges: Edge[] = [];

  for (let i = 0; i < teams.length - 1; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i];
      const team2 = teams[j];

      // Tier constraint check (relaxed at level 2+)
      if (relaxationLevel < 2 && isExtremeTierDifference(team1, team2)) {
        continue;
      }

      // Rematch constraint check (relaxed at level 1+)
      const hasPlayedBefore =
        config.avoidRematches && haveTeamsPlayedBeforeSync(team1.id, team2.id, config);
      if (relaxationLevel < 1 && hasPlayedBefore && !isBothRecreational(team1, team2)) {
        continue;
      }

      const weight = config.getCompatibilityScoreFn(team1, team2);
      const pairingKey = [team1.id, team2.id].sort().join('-');

      // Apply penalty for relaxed constraints
      let adjustedWeight = weight;
      if (hasPlayedBefore) {
        adjustedWeight -= 50;
      }
      if (isExtremeTierDifference(team1, team2)) {
        adjustedWeight -= 100;
      }

      edges.push({
        team1,
        team2,
        weight: adjustedWeight,
        hasPlayedBefore: hasPlayedBefore || false,
        pairingKey,
      });
    }
  }

  return edges;
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

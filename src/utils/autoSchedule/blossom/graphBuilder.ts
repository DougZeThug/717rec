import { Team } from '@/types';
import { TeamPairing } from '@/types/autoSchedule';
import { debugLog } from '@/utils/logger';

import { haveTeamsPlayedBeforeSync } from './historyUtils';
import { isBothRecreational, isExtremeTierDifference } from './tierUtils';
import { Edge, RelaxationLevel, TeamPairingConfig } from './types';

/**
 * Check if edge should be excluded based on hard constraints
 */
export function shouldExcludeEdge(team1: Team, team2: Team, config: TeamPairingConfig): boolean {
  // Hard constraint: Block T1 vs T3 (extreme tier difference)
  if (isExtremeTierDifference(team1, team2)) {
    debugLog(`Blocking extreme tier difference: ${team1.name} vs ${team2.name}`);
    return true;
  }

  // Hard constraint: Block rematches (except T3 vs T3)
  // Always check playedPairsSet — covers both season history (when avoidRematches=true)
  // and same-session rematches (always added by standardPairing across blocks)
  const hasPlayedBefore = haveTeamsPlayedBeforeSync(team1.id, team2.id, config);
  if (hasPlayedBefore && !isBothRecreational(team1, team2)) {
    debugLog(`Blocking rematch: ${team1.name} vs ${team2.name}`);
    return true;
  }

  return false;
}

/**
 * Build weighted graph with compatibility scores as edge weights
 * Apply hard constraints by excluding invalid edges
 */
export function buildWeightedGraph(teams: Team[], config: TeamPairingConfig): Edge[] {
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
      const rawScore = config.getCompatibilityScoreFn(team1, team2);
      let weight = rawScore;

      // Always compute accurate metadata — covers both season history (when
      // avoidRematches=true) and same-session rematches (always added by
      // standardPairing across blocks). Downstream consumers (toast counts,
      // quality analysis, metrics) rely on hasPlayedBefore being correct
      // regardless of the avoidRematches flag.
      const hasPlayedBefore = haveTeamsPlayedBeforeSync(team1.id, team2.id, config);

      // Apply rematch penalty for T3 vs T3 (recreational) rematches only when
      // the user opted into rematch avoidance. shouldExcludeEdge allows these
      // through, but they should still be penalized so the algorithm prefers
      // non-rematch alternatives.
      if (config.avoidRematches && hasPlayedBefore && isBothRecreational(team1, team2)) {
        weight -= 50;
      }

      const pairingKey = [team1.id, team2.id].sort().join('-');

      edges.push({
        team1,
        team2,
        weight,
        rawScore,
        hasPlayedBefore,
        pairingKey,
      });
    }
  }

  return edges;
}

/**
 * Build edges with selective constraint relaxation for specific at-risk teams
 */
export function buildWeightedGraphWithRelaxation(
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
      // Always check playedPairsSet — covers both season history and same-session rematches
      const hasPlayedBefore = haveTeamsPlayedBeforeSync(team1.id, team2.id, config);
      if (effectiveRelaxation < 1 && hasPlayedBefore && !isBothRecreational(team1, team2)) {
        continue;
      }

      const rawScore = config.getCompatibilityScoreFn(team1, team2);
      const pairingKey = [team1.id, team2.id].sort().join('-');

      // Apply penalty for relaxed constraints (lower priority than normal matches)
      let adjustedWeight = rawScore;
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
        rawScore,
        hasPlayedBefore: hasPlayedBefore || false,
        pairingKey,
      });
    }
  }

  return edges;
}

/**
 * Build edges with a specific relaxation level applied to ALL teams
 */
export function buildEdgesWithRelaxationLevel(
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
      // Always compute accurate metadata; only gate the constraint/penalty on avoidRematches.
      const hasPlayedBefore = haveTeamsPlayedBeforeSync(team1.id, team2.id, config);
      const rematchActive = config.avoidRematches && hasPlayedBefore;
      if (relaxationLevel < 1 && rematchActive && !isBothRecreational(team1, team2)) {
        continue;
      }

      const rawScore = config.getCompatibilityScoreFn(team1, team2);
      const pairingKey = [team1.id, team2.id].sort().join('-');

      // Apply penalty for relaxed constraints
      let adjustedWeight = rawScore;
      if (rematchActive) {
        adjustedWeight -= 50;
      }
      if (isExtremeTierDifference(team1, team2)) {
        adjustedWeight -= 100;
      }

      edges.push({
        team1,
        team2,
        weight: adjustedWeight,
        rawScore,
        hasPlayedBefore,
        pairingKey,
      });
    }
  }

  return edges;
}

/**
 * Build graph with very relaxed constraints for fallback
 */
export function _buildRelaxedGraph(teams: Team[], config: TeamPairingConfig): Edge[] {
  const edges: Edge[] = [];

  for (let i = 0; i < teams.length - 1; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i];
      const team2 = teams[j];

      // Only block extreme tier differences in relaxed mode
      if (isExtremeTierDifference(team1, team2)) {
        continue;
      }

      const rawScore = config.getCompatibilityScoreFn(team1, team2);
      const hasPlayedBefore = config.avoidRematches
        ? haveTeamsPlayedBeforeSync(team1.id, team2.id, config)
        : false;

      const pairingKey = [team1.id, team2.id].sort().join('-');

      edges.push({
        team1,
        team2,
        weight: rawScore,
        rawScore,
        hasPlayedBefore,
        pairingKey,
      });
    }
  }

  return edges;
}

/**
 * Create a map for quick edge lookup
 */
export function createEdgeMap(edges: Edge[]): Map<string, Edge> {
  const edgeMap = new Map<string, Edge>();
  edges.forEach((edge) => {
    edgeMap.set(edge.pairingKey, edge);
  });
  return edgeMap;
}

/**
 * Remove edges that have already been used in previous rounds
 */
export function filterUsedEdges(edges: Edge[], usedPairings: TeamPairing[]): Edge[] {
  const usedTeamPairs = new Set<string>();

  // Mark all team pairs that have already been matched
  usedPairings.forEach((pairing) => {
    const pairingKey = [pairing.team1.id, pairing.team2.id].sort().join('-');
    usedTeamPairs.add(pairingKey);
  });

  // Filter out used edges
  return edges.filter((edge) => !usedTeamPairs.has(edge.pairingKey));
}

import edmondsBlossom from 'edmonds-blossom';

import { Team } from '@/types';
import { TeamPairing } from '@/types/autoSchedule';
import { debugLog, errorLog, warnLog } from '@/utils/logger';

import { createEdgeMap } from './graphBuilder';
import { Edge } from './types';

/**
 * Run Edmonds' Blossom algorithm for maximum weight matching
 */
export function runBlossomMatching(teams: Team[], edges: Edge[], round: number): TeamPairing[] {
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

  // Build edge list in format expected by edmonds-blossom: [[node1, node2, weight], ...]
  // edmonds-blossom ignores negative-weight edges (it maximizes total weight, so negative
  // edges are worse than leaving nodes unmatched). Apply a positive offset to all weights
  // so penalized edges remain usable but still less preferred than non-penalized ones.
  const minWeight = Math.min(...edges.map((e) => e.weight));
  const offset = minWeight < 1 ? Math.abs(minWeight) + 1 : 0;

  const edgeList: number[][] = [];
  for (const edge of edges) {
    const index1 = teamIndexMap.get(edge.team1.id);
    const index2 = teamIndexMap.get(edge.team2.id);

    if (index1 === undefined || index2 === undefined) {
      warnLog(
        `Skipping edge with unknown team in round ${round}: ${edge.team1.id} vs ${edge.team2.id}`
      );
      continue;
    }

    edgeList.push([index1, index2, edge.weight + offset]);
  }

  if (edgeList.length === 0) {
    warnLog(`No valid mapped edges for round ${round}`);
    return [];
  }

  try {
    // Run Blossom algorithm with edge list format
    const matching = edmondsBlossom(edgeList);

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
          compatibilityScore: edge.rawScore,
          hasPlayedBefore: edge.hasPlayedBefore,
        });

        debugLog(
          `Round ${round}: ${team1.name} vs ${team2.name} (score: ${edge.rawScore.toFixed(1)})`
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
 * Count matches per team from pairings
 */
export function countTeamMatches(teams: Team[], pairings: TeamPairing[]): Map<string, number> {
  const counts = new Map<string, number>();
  teams.forEach((team) => counts.set(team.id, 0));

  pairings.forEach((pairing) => {
    counts.set(pairing.team1.id, (counts.get(pairing.team1.id) || 0) + 1);
    counts.set(pairing.team2.id, (counts.get(pairing.team2.id) || 0) + 1);
  });

  return counts;
}

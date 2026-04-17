import { Team } from '@/types';
import { TeamPairing } from '@/types/autoSchedule';
import { debugLog, scheduleLog, warnLog } from '@/utils/logger';

import { buildEdgesWithRelaxationLevel } from './graphBuilder';
import { Edge, RelaxationLevel, TeamPairingConfig } from './types';

/**
 * Repair unmatched teams after a round by finding available partners
 * Uses greedy matching to fill gaps left by Blossom
 */
export function repairUnmatchedTeams(
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
          compatibilityScore: edge.rawScore,
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
 * Guaranteed matching solution that uses progressive constraint relaxation
 * and prioritizes teams with fewer options
 */
export async function findGuaranteedSolution(
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
    for (const { team, matchesNeeded: _matchesNeeded } of teamPriority) {
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
          compatibilityScore: edge.rawScore,
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
      debugLog(`Relaxation level ${relaxLevel} incomplete, trying level ${relaxLevel + 1}...`);
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

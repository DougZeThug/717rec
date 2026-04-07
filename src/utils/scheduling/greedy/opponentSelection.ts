import { Team } from '@/types';

import { canPlay, countValidOpponents, tierDistance } from './constraints';
import { pairKey } from './pairKey';
import { RelaxationLevel } from './types';

/**
 * Find best opponent for a team using greedy selection
 *
 * When allUnpairedTeams is provided, uses constraint-aware tie-breaking:
 * candidates with fewer remaining valid opponents are preferred first,
 * preventing them from being stranded later in the greedy pass.
 */
export function findBestOpponent(
  team: Team,
  candidates: Team[],
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  teamMatchCounts: Map<string, number>,
  maxTierGap: number,
  relaxationLevel: RelaxationLevel = 0,
  allUnpairedTeams?: Team[],
  rematchAllowedFor?: Set<string>
): Team | null {
  const validCandidates = candidates.filter(
    (candidate) =>
      candidate.id !== team.id &&
      canPlay(
        team,
        candidate,
        playedSet,
        tonightPairs,
        maxTierGap,
        relaxationLevel,
        rematchAllowedFor
      )
  );

  if (validCandidates.length === 0) return null;

  // Pre-compute remaining valid opponents for each candidate (constraint-aware tie-breaking)
  // Candidates with fewer alternatives should be picked first so they don't get stranded.
  const candidateOptionCounts = new Map<string, number>();
  if (allUnpairedTeams && allUnpairedTeams.length > 2) {
    for (const candidate of validCandidates) {
      candidateOptionCounts.set(
        candidate.id,
        countValidOpponents(
          candidate,
          allUnpairedTeams,
          team.id,
          playedSet,
          tonightPairs,
          maxTierGap,
          relaxationLevel,
          rematchAllowedFor
        )
      );
    }
  }

  // Sort by priority:
  // 1. Same division (tier distance = 0) - prioritize even with relaxation
  // 2. Adjacent tier (tier distance = 1)
  // 3. Not a season rematch (prefer fresh opponents even when rematches allowed)
  // 4. Fewer total matches scheduled tonight
  // 5. Fewest remaining valid opponents (most constrained first - prevents stranding)
  // 6. Alphabetically by name (stable tie-break)
  validCandidates.sort((a, b) => {
    const distA = tierDistance(team, a);
    const distB = tierDistance(team, b);

    if (distA !== distB) return distA - distB;

    // When relaxation allows cross-tier, prefer same/adjacent tier
    if (relaxationLevel >= 1) {
      if (distA !== distB) return distA - distB;
    }

    // When relaxation allows rematches, still prefer non-rematches
    if (relaxationLevel >= 2 || (rematchAllowedFor && rematchAllowedFor.size > 0)) {
      const aIsRematch = playedSet.has(pairKey(team.id, a.id));
      const bIsRematch = playedSet.has(pairKey(team.id, b.id));
      if (aIsRematch !== bIsRematch) return aIsRematch ? 1 : -1;
    }

    const matchesA = teamMatchCounts.get(a.id) || 0;
    const matchesB = teamMatchCounts.get(b.id) || 0;

    if (matchesA !== matchesB) return matchesA - matchesB;

    // Prefer candidates with fewer remaining options (most constrained first)
    if (candidateOptionCounts.size > 0) {
      const optionsA = candidateOptionCounts.get(a.id) ?? Infinity;
      const optionsB = candidateOptionCounts.get(b.id) ?? Infinity;
      if (optionsA !== optionsB) return optionsA - optionsB;
    }

    return a.name.localeCompare(b.name);
  });

  return validCandidates[0];
}

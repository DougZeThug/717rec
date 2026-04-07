import { Team } from '@/types';
import { warnLog } from '@/utils/logger';
import { pairKey } from './pairKey';
import { RelaxationLevel } from './types';

/**
 * Extract tier number from division name
 * Maps display division names to tier numbers:
 * - Competitive → Tier 1
 * - Intermediate → Tier 2
 * - Recreational → Tier 3
 */
export function getTier(team: Team): number {
  const divisionName = (team.divisionName || '').toLowerCase();

  // Map display division names to tier numbers
  if (divisionName.includes('competitive')) return 1;
  if (divisionName.includes('intermediate')) return 2;
  if (divisionName.includes('recreational')) return 3;

  // Fallback: try to extract tier number from name (e.g., "Tier 2")
  const tierMatch = divisionName.match(/tier\s*(\d+)/i);
  if (tierMatch) {
    return parseInt(tierMatch[1], 10);
  }

  // Default to tier 2 (middle) if unknown
  warnLog(`Unknown division for team ${team.name}: "${team.divisionName}"`);
  return 2;
}

/**
 * Calculate tier distance between two teams
 */
export function tierDistance(teamA: Team, teamB: Team): number {
  return Math.abs(getTier(teamA) - getTier(teamB));
}

/**
 * Check if two teams can play against each other
 * @param relaxationLevel - Level of constraint relaxation (0-3)
 *   0: All constraints enforced
 *   1: Allow cross-tier matches (tier gap > maxTierGap)
 *   2: Allow season rematches
 *   3: Full relaxation (only session rematches blocked)
 */
export function canPlay(
  teamA: Team,
  teamB: Team,
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  maxTierGap: number,
  relaxationLevel: RelaxationLevel = 0,
  rematchAllowedFor?: Set<string>
): boolean {
  const key = pairKey(teamA.id, teamB.id);

  // NEVER relax session rematches - teams can't play twice in same session.
  // This is also what makes forbiddenPairs (cross-block session pairs) hard:
  // baseTonightPairs is seeded from forbiddenPairs, so this check enforces
  // them at every relaxation level.
  if (tonightPairs.has(key)) return false;

  // Check tier gap (relaxed at level 1+) — cosmetic preference, relax first
  if (relaxationLevel < 1 && tierDistance(teamA, teamB) > maxTierGap) return false;

  // Check season rematches.
  // - At relaxationLevel >= 2 (legacy slot-wide relaxation, kept as final fallback): allowed.
  // - Otherwise: allowed only if either team has been individually granted permission
  //   via rematchAllowedFor (per-team, last-resort escalation).
  if (playedSet.has(key) && relaxationLevel < 2) {
    const perTeamAllowed =
      rematchAllowedFor !== undefined &&
      (rematchAllowedFor.has(teamA.id) || rematchAllowedFor.has(teamB.id));
    if (!perTeamAllowed) return false;
  }

  return true;
}

/**
 * Count valid opponents for a team among a set of unpaired teams
 */
export function countValidOpponents(
  team: Team,
  unpairedTeams: Team[],
  excludeId: string,
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  maxTierGap: number,
  relaxationLevel: RelaxationLevel,
  rematchAllowedFor?: Set<string>
): number {
  let count = 0;
  for (const other of unpairedTeams) {
    if (
      other.id !== team.id &&
      other.id !== excludeId &&
      canPlay(team, other, playedSet, tonightPairs, maxTierGap, relaxationLevel, rematchAllowedFor)
    ) {
      count++;
    }
  }
  return count;
}

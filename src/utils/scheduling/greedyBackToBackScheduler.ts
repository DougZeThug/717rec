/**
 * Greedy Back-to-Back Scheduler
 *
 * Schedules teams for TWO matches in consecutive timeslots (S1, S2).
 *
 * ALGORITHM:
 * - Even teams: Everyone plays in S1 and S2 (one match per slot)
 * - Odd teams: Bye1 sits out S1, Bye2 sits out S2, they play each other in S3
 *
 * CONSTRAINTS (with progressive relaxation):
 * - No rematches against season history (relaxed at level 1)
 * - No session rematches (can't play same team twice tonight - never relaxed)
 * - Max tier gap = 1 (blocks T1 vs T3+) (relaxed at level 2)
 * - Favor same-division first, then adjacent-tier
 *
 * CONSTRAINT RELAXATION:
 * When constraints are too tight (e.g., T1 teams can only play T1, but all have
 * played each other), the scheduler progressively relaxes constraints:
 * - Level 0: All constraints enforced
 * - Level 1: Allow season rematches
 * - Level 2: Allow tier gap > 1 (T1 vs T3)
 * - Level 3: Full relaxation (only session rematches blocked)
 *
 * GUARANTEES:
 * - Every team gets exactly 2 matches
 * - Deterministic (same input = same output)
 * - Fast O(N²) greedy selection
 *
 * ODD TEAM HANDLING:
 * When there's an odd number of teams, we ensure everyone still gets 2 matches:
 * 1. Select Bye1 (team that sits out Slot 1)
 * 2. Generate S1 pairings for all others
 * 3. Select Bye2 (team that sits out Slot 2, must not have played Bye1 before)
 * 4. Generate S2 pairings for all others
 * 5. Create S3 (third slot) where Bye1 plays Bye2
 * Result: Bye1 has matches in S2+S3, Bye2 has matches in S1+S3, everyone else has S1+S2
 *
 * USAGE:
 * ```typescript
 * const matches = generateScheduleGreedy({
 *   teams: allTeams,
 *   historyPairs: seasonHistory, // [[teamAId, teamBId], ...]
 *   slots: ["8:30", "9:00"],
 *   thirdSlot: "9:30", // Optional, used only for odd team count
 *   config: {
 *     maxTierGap: 1, // Default: 1 (prevents T1 vs T3)
 *     byeStrategy: 'last' // Default: 'last'
 *   }
 * });
 * ```
 */

import { Team } from '@/types';
import { scheduleLog, warnLog } from '@/utils/logger';

/**
 * Constraint relaxation levels for progressive fallback
 * - 0: All constraints enforced (default)
 * - 1: Allow season rematches
 * - 2: Allow tier gap > 1
 * - 3: Full relaxation (emergency - only blocks session rematches)
 */
export type RelaxationLevel = 0 | 1 | 2 | 3;

export interface GreedySchedulerInput {
  teams: Team[];
  historyPairs: Array<[string, string]>; // Season history
  slots: [string, string]; // Base slots (e.g., ["8:30", "9:00"])
  thirdSlot?: string; // Optional S3 for odd-team nights (e.g., "9:30")
  config?: {
    maxTierGap?: number; // Default: 1 (blocks T1 vs T3)
    byeStrategy?: 'last' | 'fewestPartners'; // Default: 'last'
  };
  // Pairs already created in other blocks (for double header teams)
  // These pairs will be forbidden to prevent duplicate opponents across blocks
  forbiddenPairs?: Set<string>;
}

export interface ScheduledMatch {
  slot: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  divisionA: string;
  divisionB: string;
  tierA: number;
  tierB: number;
}

const MAX_TIER_GAP = 1; // Block tier differences > 1
const DEFAULT_BYE_STRATEGY = 'last';

/**
 * Generate canonical pairing key (sorted IDs)
 * Exported so callers can build forbiddenPairs sets
 */
export function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}||${idB}` : `${idB}||${idA}`;
}

/**
 * Extract tier number from division name
 * Maps display division names to tier numbers:
 * - Competitive → Tier 1
 * - Intermediate → Tier 2
 * - Recreational → Tier 3
 */
function getTier(team: Team): number {
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
function tierDistance(teamA: Team, teamB: Team): number {
  return Math.abs(getTier(teamA) - getTier(teamB));
}

/**
 * Check if two teams can play against each other
 * @param relaxationLevel - Level of constraint relaxation (0-3)
 *   0: All constraints enforced
 *   1: Allow season rematches
 *   2: Allow tier gap > maxTierGap
 *   3: Full relaxation (only session rematches blocked)
 */
function canPlay(
  teamA: Team,
  teamB: Team,
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  maxTierGap: number,
  relaxationLevel: RelaxationLevel = 0
): boolean {
  const key = pairKey(teamA.id, teamB.id);

  // NEVER relax session rematches - teams can't play twice in same session
  if (tonightPairs.has(key)) return false;

  // Check season rematches (relaxed at level 1+)
  if (relaxationLevel < 1 && playedSet.has(key)) return false;

  // Check tier gap (relaxed at level 2+)
  if (relaxationLevel < 2 && tierDistance(teamA, teamB) > maxTierGap) return false;

  return true;
}

/**
 * Analyze if a valid pairing is feasible with current constraints
 * Returns the recommended relaxation level needed
 */
function analyzeGreedyFeasibility(
  teams: Team[],
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  maxTierGap: number
): { isFeasible: boolean; recommendedLevel: RelaxationLevel; atRiskTeams: string[] } {
  const targetMatchesPerTeam = 2;
  const atRiskTeams: string[] = [];

  // Step 1: Basic count check - does each team have >= 2 valid opponents?
  for (const team of teams) {
    let validOpponents = 0;
    for (const other of teams) {
      if (other.id !== team.id && canPlay(team, other, playedSet, tonightPairs, maxTierGap, 0)) {
        validOpponents++;
      }
    }
    if (validOpponents < targetMatchesPerTeam) {
      atRiskTeams.push(team.id);
    }
  }

  // If basic count check fails, determine which relaxation level helps
  if (atRiskTeams.length > 0) {
    return determineRelaxationLevel(teams, atRiskTeams, playedSet, tonightPairs, maxTierGap);
  }

  // Step 2: Simulate S1+S2 to check if opponent pool depletion causes rematches.
  // The basic count says everyone has >= 2 opponents, but S1 and S2 consume from
  // the SAME pool. A greedy S1 might leave S2 with only rematch options.
  const simResult = simulateS1S2Feasibility(teams, playedSet, tonightPairs, maxTierGap);
  if (simResult.needsRematches) {
    scheduleLog(
      `Feasibility simulation: S1 greedy pass would force ${simResult.s2RematchCount} S2 rematch(es). ` +
        `Keeping level 0 (rematch-aware swap will handle this).`
    );
    // Don't recommend relaxation -- the rematch-aware swap (Fix 1) will fix these.
    // Only recommend relaxation if truly necessary (basic count fails).
  }

  return { isFeasible: true, recommendedLevel: 0, atRiskTeams: [] };
}

/**
 * Determine which relaxation level would resolve at-risk teams
 */
function determineRelaxationLevel(
  teams: Team[],
  atRiskTeams: string[],
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  maxTierGap: number
): { isFeasible: boolean; recommendedLevel: RelaxationLevel; atRiskTeams: string[] } {
  const targetMatchesPerTeam = 2;

  // Check if relaxing season rematches would help
  let wouldHelpWithRematch = false;
  for (const teamId of atRiskTeams) {
    const team = teams.find((t) => t.id === teamId)!;
    let validWithRematch = 0;
    for (const other of teams) {
      if (other.id !== team.id && canPlay(team, other, playedSet, tonightPairs, maxTierGap, 1)) {
        validWithRematch++;
      }
    }
    if (validWithRematch >= targetMatchesPerTeam) {
      wouldHelpWithRematch = true;
      break;
    }
  }

  if (wouldHelpWithRematch) {
    return { isFeasible: false, recommendedLevel: 1, atRiskTeams };
  }

  // Check if relaxing tier constraints would help
  let wouldHelpWithTier = false;
  for (const teamId of atRiskTeams) {
    const team = teams.find((t) => t.id === teamId)!;
    let validWithTier = 0;
    for (const other of teams) {
      if (other.id !== team.id && canPlay(team, other, playedSet, tonightPairs, maxTierGap, 2)) {
        validWithTier++;
      }
    }
    if (validWithTier >= targetMatchesPerTeam) {
      wouldHelpWithTier = true;
      break;
    }
  }

  if (wouldHelpWithTier) {
    return { isFeasible: false, recommendedLevel: 2, atRiskTeams };
  }

  // Full relaxation needed
  return { isFeasible: false, recommendedLevel: 3, atRiskTeams };
}

/**
 * Simulate a greedy S1 pass and check if S2 would require season rematches.
 * This models the opponent pool depletion that the simple count check misses.
 *
 * Returns whether the simulation predicts S2 rematches and how many.
 */
function simulateS1S2Feasibility(
  teams: Team[],
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  maxTierGap: number
): { needsRematches: boolean; s2RematchCount: number } {
  // Quick greedy S1 simulation
  const simTonightPairs = new Set<string>(tonightPairs);
  const pairedInS1 = new Set<string>();

  // Simulate S1: greedily pair teams
  for (const team of teams) {
    if (pairedInS1.has(team.id)) continue;

    for (const other of teams) {
      if (
        other.id !== team.id &&
        !pairedInS1.has(other.id) &&
        canPlay(team, other, playedSet, simTonightPairs, maxTierGap, 0)
      ) {
        pairedInS1.add(team.id);
        pairedInS1.add(other.id);
        simTonightPairs.add(pairKey(team.id, other.id));
        break;
      }
    }
  }

  // If S1 couldn't pair everyone, relaxation might be needed for other reasons
  if (pairedInS1.size < teams.length) {
    return { needsRematches: false, s2RematchCount: 0 };
  }

  // Simulate S2: check how many teams would need rematches
  const pairedInS2 = new Set<string>();
  let s2RematchCount = 0;

  for (const team of teams) {
    if (pairedInS2.has(team.id)) continue;

    let foundNonRematch = false;
    for (const other of teams) {
      if (
        other.id !== team.id &&
        !pairedInS2.has(other.id) &&
        canPlay(team, other, playedSet, simTonightPairs, maxTierGap, 0)
      ) {
        pairedInS2.add(team.id);
        pairedInS2.add(other.id);
        simTonightPairs.add(pairKey(team.id, other.id));
        foundNonRematch = true;
        break;
      }
    }

    // If no non-rematch opponent available, check if a rematch opponent exists
    if (!foundNonRematch && !pairedInS2.has(team.id)) {
      for (const other of teams) {
        if (
          other.id !== team.id &&
          !pairedInS2.has(other.id) &&
          !simTonightPairs.has(pairKey(team.id, other.id)) // only block session rematches
        ) {
          pairedInS2.add(team.id);
          pairedInS2.add(other.id);
          simTonightPairs.add(pairKey(team.id, other.id));
          s2RematchCount++;
          break;
        }
      }
    }
  }

  return { needsRematches: s2RematchCount > 0, s2RematchCount };
}

/**
 * Count valid opponents for a team among a set of unpaired teams
 */
function countValidOpponents(
  team: Team,
  unpairedTeams: Team[],
  excludeId: string,
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  maxTierGap: number,
  relaxationLevel: RelaxationLevel
): number {
  let count = 0;
  for (const other of unpairedTeams) {
    if (
      other.id !== team.id &&
      other.id !== excludeId &&
      canPlay(team, other, playedSet, tonightPairs, maxTierGap, relaxationLevel)
    ) {
      count++;
    }
  }
  return count;
}

/**
 * Find best opponent for a team using greedy selection
 *
 * When allUnpairedTeams is provided, uses constraint-aware tie-breaking:
 * candidates with fewer remaining valid opponents are preferred first,
 * preventing them from being stranded later in the greedy pass.
 */
function findBestOpponent(
  team: Team,
  candidates: Team[],
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  teamMatchCounts: Map<string, number>,
  maxTierGap: number,
  relaxationLevel: RelaxationLevel = 0,
  allUnpairedTeams?: Team[]
): Team | null {
  const validCandidates = candidates.filter(
    (candidate) =>
      candidate.id !== team.id &&
      canPlay(team, candidate, playedSet, tonightPairs, maxTierGap, relaxationLevel)
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
          relaxationLevel
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

    // When relaxation allows rematches, still prefer non-rematches
    if (relaxationLevel >= 1) {
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

/**
 * Pick a bye team for odd-team nights
 */
function pickBye(
  teams: Team[],
  strategy: 'last' | 'fewestPartners',
  playedSet: Set<string>,
  maxTierGap: number,
  excludeIds: Set<string> = new Set(),
  relaxationLevel: RelaxationLevel = 0
): Team {
  const availableTeams = teams.filter((t) => !excludeIds.has(t.id));

  if (strategy === 'last') {
    return availableTeams[availableTeams.length - 1];
  }

  // 'fewestPartners' strategy: pick team with fewest valid opponents
  let minPartners = Infinity;
  let byeTeam = availableTeams[0];

  for (const team of availableTeams) {
    const validPartners = availableTeams.filter(
      (other) =>
        other.id !== team.id &&
        !excludeIds.has(other.id) &&
        canPlay(team, other, playedSet, new Set(), maxTierGap, relaxationLevel)
    ).length;

    if (validPartners < minPartners) {
      minPartners = validPartners;
      byeTeam = team;
    }
  }

  return byeTeam;
}

/**
 * Swap pass: when the greedy left teams unmatched (because their only remaining
 * opponent is a blocked pair), try swapping them into an existing match.
 *
 * For each pair of unmatched teams (U1, U2) that can't play each other,
 * find an existing match M=(A,B) where we can swap to (U1,A)+(U2,B)
 * or (U1,B)+(U2,A), resolving the stranding without creating new conflicts.
 */
function trySwapToFixUnmatched(
  matches: ScheduledMatch[],
  unmatchedTeams: Team[],
  slotName: string,
  allTeams: Team[],
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  teamMatchCounts: Map<string, number>,
  maxTierGap: number,
  newPairs: Set<string> | undefined,
  relaxationLevel: RelaxationLevel
): ScheduledMatch[] {
  const result = [...matches];
  const stillUnmatched = new Set(unmatchedTeams.map((t) => t.id));
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  // Try to pair unmatched teams directly first
  const unmatchedList = [...unmatchedTeams];
  for (let i = 0; i < unmatchedList.length; i++) {
    if (!stillUnmatched.has(unmatchedList[i].id)) continue;
    for (let j = i + 1; j < unmatchedList.length; j++) {
      if (!stillUnmatched.has(unmatchedList[j].id)) continue;
      const u1 = unmatchedList[i];
      const u2 = unmatchedList[j];
      if (canPlay(u1, u2, playedSet, tonightPairs, maxTierGap, relaxationLevel)) {
        const match: ScheduledMatch = {
          slot: slotName,
          teamAId: u1.id,
          teamBId: u2.id,
          teamAName: u1.name,
          teamBName: u2.name,
          divisionA: u1.divisionName || 'Unknown',
          divisionB: u2.divisionName || 'Unknown',
          tierA: getTier(u1),
          tierB: getTier(u2),
        };
        result.push(match);
        const mk = pairKey(u1.id, u2.id);
        tonightPairs.add(mk);
        if (newPairs) newPairs.add(mk);
        teamMatchCounts.set(u1.id, (teamMatchCounts.get(u1.id) || 0) + 1);
        teamMatchCounts.set(u2.id, (teamMatchCounts.get(u2.id) || 0) + 1);
        stillUnmatched.delete(u1.id);
        stillUnmatched.delete(u2.id);
      }
    }
  }

  if (stillUnmatched.size < 2) return result;

  // For remaining unmatched pairs, try swapping with existing matches
  const unmatchedArr = allTeams.filter((t) => stillUnmatched.has(t.id));
  for (let i = 0; i < unmatchedArr.length - 1; i++) {
    if (!stillUnmatched.has(unmatchedArr[i].id)) continue;
    for (let j = i + 1; j < unmatchedArr.length; j++) {
      if (!stillUnmatched.has(unmatchedArr[j].id)) continue;
      const u1 = unmatchedArr[i];
      const u2 = unmatchedArr[j];

      // Try swapping with each existing match
      for (let k = 0; k < result.length; k++) {
        const m = result[k];
        const teamA = teamMap.get(m.teamAId);
        const teamB = teamMap.get(m.teamBId);
        if (!teamA || !teamB) continue;

        // Option 1: (U1, A) + (U2, B)
        if (
          canPlay(u1, teamA, playedSet, tonightPairs, maxTierGap, relaxationLevel) &&
          canPlay(u2, teamB, playedSet, tonightPairs, maxTierGap, relaxationLevel)
        ) {
          // Remove the old match's tonight pair
          const oldKey = pairKey(teamA.id, teamB.id);
          tonightPairs.delete(oldKey);
          if (newPairs) newPairs.delete(oldKey);
          teamMatchCounts.set(teamA.id, (teamMatchCounts.get(teamA.id) || 1) - 1);
          teamMatchCounts.set(teamB.id, (teamMatchCounts.get(teamB.id) || 1) - 1);

          // Replace match k with U1 vs A
          result[k] = {
            slot: slotName,
            teamAId: u1.id,
            teamBId: teamA.id,
            teamAName: u1.name,
            teamBName: teamA.name,
            divisionA: u1.divisionName || 'Unknown',
            divisionB: teamA.divisionName || 'Unknown',
            tierA: getTier(u1),
            tierB: getTier(teamA),
          };
          const key1 = pairKey(u1.id, teamA.id);
          tonightPairs.add(key1);
          if (newPairs) newPairs.add(key1);
          teamMatchCounts.set(u1.id, (teamMatchCounts.get(u1.id) || 0) + 1);
          teamMatchCounts.set(teamA.id, (teamMatchCounts.get(teamA.id) || 0) + 1);

          // Add new match U2 vs B
          result.push({
            slot: slotName,
            teamAId: u2.id,
            teamBId: teamB.id,
            teamAName: u2.name,
            teamBName: teamB.name,
            divisionA: u2.divisionName || 'Unknown',
            divisionB: teamB.divisionName || 'Unknown',
            tierA: getTier(u2),
            tierB: getTier(teamB),
          });
          const key2 = pairKey(u2.id, teamB.id);
          tonightPairs.add(key2);
          if (newPairs) newPairs.add(key2);
          teamMatchCounts.set(u2.id, (teamMatchCounts.get(u2.id) || 0) + 1);
          teamMatchCounts.set(teamB.id, (teamMatchCounts.get(teamB.id) || 0) + 1);

          stillUnmatched.delete(u1.id);
          stillUnmatched.delete(u2.id);
          scheduleLog(
            `Swap fix: replaced (${teamA.name} vs ${teamB.name}) with (${u1.name} vs ${teamA.name}) + (${u2.name} vs ${teamB.name})`
          );
          break;
        }

        // Option 2: (U1, B) + (U2, A)
        if (
          canPlay(u1, teamB, playedSet, tonightPairs, maxTierGap, relaxationLevel) &&
          canPlay(u2, teamA, playedSet, tonightPairs, maxTierGap, relaxationLevel)
        ) {
          const oldKey = pairKey(teamA.id, teamB.id);
          tonightPairs.delete(oldKey);
          if (newPairs) newPairs.delete(oldKey);
          teamMatchCounts.set(teamA.id, (teamMatchCounts.get(teamA.id) || 1) - 1);
          teamMatchCounts.set(teamB.id, (teamMatchCounts.get(teamB.id) || 1) - 1);

          result[k] = {
            slot: slotName,
            teamAId: u1.id,
            teamBId: teamB.id,
            teamAName: u1.name,
            teamBName: teamB.name,
            divisionA: u1.divisionName || 'Unknown',
            divisionB: teamB.divisionName || 'Unknown',
            tierA: getTier(u1),
            tierB: getTier(teamB),
          };
          const key1 = pairKey(u1.id, teamB.id);
          tonightPairs.add(key1);
          if (newPairs) newPairs.add(key1);
          teamMatchCounts.set(u1.id, (teamMatchCounts.get(u1.id) || 0) + 1);
          teamMatchCounts.set(teamB.id, (teamMatchCounts.get(teamB.id) || 0) + 1);

          result.push({
            slot: slotName,
            teamAId: u2.id,
            teamBId: teamA.id,
            teamAName: u2.name,
            teamBName: teamA.name,
            divisionA: u2.divisionName || 'Unknown',
            divisionB: teamA.divisionName || 'Unknown',
            tierA: getTier(u2),
            tierB: getTier(teamA),
          });
          const key2 = pairKey(u2.id, teamA.id);
          tonightPairs.add(key2);
          if (newPairs) newPairs.add(key2);
          teamMatchCounts.set(u2.id, (teamMatchCounts.get(u2.id) || 0) + 1);
          teamMatchCounts.set(teamA.id, (teamMatchCounts.get(teamA.id) || 0) + 1);

          stillUnmatched.delete(u1.id);
          stillUnmatched.delete(u2.id);
          scheduleLog(
            `Swap fix: replaced (${teamA.name} vs ${teamB.name}) with (${u1.name} vs ${teamB.name}) + (${u2.name} vs ${teamA.name})`
          );
          break;
        }
      }
      if (!stillUnmatched.has(u1.id)) break; // u1 was matched, move to next
    }
  }

  if (stillUnmatched.size > 0) {
    warnLog(`Swap pass: ${stillUnmatched.size} teams still unmatched after swap attempts`);
  }

  return result;
}

/**
 * Generate pairings for a single slot (greedy)
 */
function generateSlotPairings(
  teams: Team[],
  slotName: string,
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  teamMatchCounts: Map<string, number>,
  maxTierGap: number,
  byeTeamId?: string,
  newPairs?: Set<string>,
  relaxationLevel: RelaxationLevel = 0
): ScheduledMatch[] {
  const matches: ScheduledMatch[] = [];
  const pairedInSlot = new Set<string>();

  if (byeTeamId) {
    pairedInSlot.add(byeTeamId);
  }

  for (const team of teams) {
    if (pairedInSlot.has(team.id)) continue;

    const availableCandidates = teams.filter((t) => !pairedInSlot.has(t.id));
    const opponent = findBestOpponent(
      team,
      availableCandidates,
      playedSet,
      tonightPairs,
      teamMatchCounts,
      maxTierGap,
      relaxationLevel,
      availableCandidates // pass all unpaired teams for constraint-aware tie-breaking
    );

    if (!opponent) {
      warnLog(
        `No opponent found for team ${team.name} in slot ${slotName} (relaxation: ${relaxationLevel})`
      );
      continue;
    }

    // Create match
    const match: ScheduledMatch = {
      slot: slotName,
      teamAId: team.id,
      teamBId: opponent.id,
      teamAName: team.name,
      teamBName: opponent.name,
      divisionA: team.divisionName || 'Unknown',
      divisionB: opponent.divisionName || 'Unknown',
      tierA: getTier(team),
      tierB: getTier(opponent),
    };

    matches.push(match);

    // Mark both teams as paired in this slot
    pairedInSlot.add(team.id);
    pairedInSlot.add(opponent.id);

    // Add to tonight pairs to prevent session rematches
    const matchKey = pairKey(team.id, opponent.id);
    tonightPairs.add(matchKey);
    // Track this as a new pair we created (for cross-block tracking)
    if (newPairs) {
      newPairs.add(matchKey);
    }

    // Increment match counts
    teamMatchCounts.set(team.id, (teamMatchCounts.get(team.id) || 0) + 1);
    teamMatchCounts.set(opponent.id, (teamMatchCounts.get(opponent.id) || 0) + 1);
  }

  // Swap pass: fix stranded teams by swapping with existing matches
  const unmatchedTeams = teams.filter(
    (t) => !pairedInSlot.has(t.id) && (!byeTeamId || t.id !== byeTeamId)
  );
  if (unmatchedTeams.length >= 2) {
    const swapResult = trySwapToFixUnmatched(
      matches,
      unmatchedTeams,
      slotName,
      teams,
      playedSet,
      tonightPairs,
      teamMatchCounts,
      maxTierGap,
      newPairs,
      relaxationLevel
    );
    return swapResult;
  }

  return matches;
}

/**
 * Cross-slot swap: when S2 has unmatched teams because S1's greedy choices
 * consumed pairings that S2 needed, try breaking one S1 match and rearranging
 * both slots so that all teams can be paired without relaxation.
 *
 * For each S1 match (A,B), check if breaking it and re-pairing A and B with
 * teams from another S1 match (C,D) would free up the pairings S2 needs.
 *
 * Returns null if no cross-slot swap can fix the problem.
 */
function tryCrossSlotSwap(
  s1Matches: ScheduledMatch[],
  s2Matches: ScheduledMatch[],
  sortedTeams: Team[],
  slot1: string,
  slot2: string,
  playedSet: Set<string>,
  forbiddenPairs: Set<string> | undefined,
  maxTierGap: number,
  relaxationLevel: RelaxationLevel
): { s1: ScheduledMatch[]; s2: ScheduledMatch[] } | null {
  // Identify unmatched teams in S2
  const s2PairedIds = new Set(s2Matches.flatMap((m) => [m.teamAId, m.teamBId]));
  const unmatchedInS2 = sortedTeams.filter((t) => !s2PairedIds.has(t.id));

  if (unmatchedInS2.length < 2) return null;

  const teamMap = new Map(sortedTeams.map((t) => [t.id, t]));

  // For each S1 match, try breaking it and see if rearranging fixes S2
  for (let i = 0; i < s1Matches.length; i++) {
    const s1Match = s1Matches[i];
    const teamA = teamMap.get(s1Match.teamAId);
    const teamB = teamMap.get(s1Match.teamBId);
    if (!teamA || !teamB) continue;

    // Try swapping this S1 match with every other S1 match
    for (let j = 0; j < s1Matches.length; j++) {
      if (i === j) continue;
      const otherMatch = s1Matches[j];
      const teamC = teamMap.get(otherMatch.teamAId);
      const teamD = teamMap.get(otherMatch.teamBId);
      if (!teamC || !teamD) continue;

      // Try all rearrangements of {A,B,C,D} into two S1 pairs
      // that differ from the originals (A,B) and (C,D)
      const rearrangements: [Team, Team, Team, Team][] = [
        [teamA, teamC, teamB, teamD], // (A,C) + (B,D)
        [teamA, teamD, teamB, teamC], // (A,D) + (B,C)
      ];

      for (const [p1a, p1b, p2a, p2b] of rearrangements) {
        // Build a temporary tonight-pairs set with the rearranged S1
        const tempTonightPairs = new Set<string>(forbiddenPairs || []);

        // Add all S1 matches except i and j
        for (let k = 0; k < s1Matches.length; k++) {
          if (k === i || k === j) continue;
          tempTonightPairs.add(pairKey(s1Matches[k].teamAId, s1Matches[k].teamBId));
        }

        // Check if the new S1 pairs are valid
        const newKey1 = pairKey(p1a.id, p1b.id);
        const newKey2 = pairKey(p2a.id, p2b.id);

        if (
          !canPlay(p1a, p1b, playedSet, tempTonightPairs, maxTierGap, relaxationLevel) ||
          !canPlay(p2a, p2b, playedSet, tempTonightPairs, maxTierGap, relaxationLevel)
        ) {
          continue;
        }

        // Add new S1 pairs
        tempTonightPairs.add(newKey1);
        tempTonightPairs.add(newKey2);

        // Now try to generate S2 with this new tonight-pairs set
        const tempMatchCounts = new Map<string, number>();
        for (const t of sortedTeams) {
          tempMatchCounts.set(t.id, 1); // Everyone played once in S1
        }

        const tempNewPairs = new Set<string>();
        const candidateS2 = generateSlotPairings(
          sortedTeams,
          slot2,
          playedSet,
          tempTonightPairs,
          tempMatchCounts,
          maxTierGap,
          undefined,
          tempNewPairs,
          relaxationLevel
        );

        const s2TeamCount = new Set(candidateS2.flatMap((m) => [m.teamAId, m.teamBId])).size;
        if (s2TeamCount === sortedTeams.length) {
          // Success! Build the new S1 matches
          const newS1 = s1Matches.map((m, idx) => {
            if (idx === i) {
              return {
                slot: slot1,
                teamAId: p1a.id,
                teamBId: p1b.id,
                teamAName: p1a.name,
                teamBName: p1b.name,
                divisionA: p1a.divisionName || 'Unknown',
                divisionB: p1b.divisionName || 'Unknown',
                tierA: getTier(p1a),
                tierB: getTier(p1b),
              };
            }
            if (idx === j) {
              return {
                slot: slot1,
                teamAId: p2a.id,
                teamBId: p2b.id,
                teamAName: p2a.name,
                teamBName: p2b.name,
                divisionA: p2a.divisionName || 'Unknown',
                divisionB: p2b.divisionName || 'Unknown',
                tierA: getTier(p2a),
                tierB: getTier(p2b),
              };
            }
            return m;
          });

          scheduleLog(
            `Cross-slot swap: rearranged S1 (${teamA.name},${teamB.name}) + (${teamC.name},${teamD.name}) → ` +
              `(${p1a.name},${p1b.name}) + (${p2a.name},${p2b.name}) to unblock S2`
          );

          return { s1: newS1, s2: candidateS2 };
        }
      }
    }
  }

  return null;
}

/**
 * Rematch-aware cross-slot optimization: after generating S1 and S2, look for
 * S2 matches that are season rematches and try rearranging S1 to eliminate them.
 *
 * For each S2 rematch (X vs Y where playedSet has that pair), scan S1 for a match
 * (A vs B) where swapping creates valid non-rematch alternatives for both slots.
 *
 * This is different from tryCrossSlotSwap which only fires when S2 has *unmatched*
 * teams. This fires when S2 "succeeded" but used rematches to do it.
 */
function tryRematchAwareSwap(
  s1Matches: ScheduledMatch[],
  s2Matches: ScheduledMatch[],
  sortedTeams: Team[],
  slot1: string,
  slot2: string,
  playedSet: Set<string>,
  forbiddenPairs: Set<string> | undefined,
  maxTierGap: number,
  relaxationLevel: RelaxationLevel
): { s1: ScheduledMatch[]; s2: ScheduledMatch[]; swapsApplied: number } | null {
  const teamMap = new Map(sortedTeams.map((t) => [t.id, t]));

  // Identify S2 rematches
  const s2RematchIndices: number[] = [];
  for (let i = 0; i < s2Matches.length; i++) {
    const m = s2Matches[i];
    if (playedSet.has(pairKey(m.teamAId, m.teamBId))) {
      s2RematchIndices.push(i);
    }
  }

  if (s2RematchIndices.length === 0) return null;

  scheduleLog(
    `Rematch-aware swap: found ${s2RematchIndices.length} S2 rematch(es), attempting to resolve`
  );

  // Work on mutable copies
  const newS1 = [...s1Matches];
  const newS2 = [...s2Matches];
  let swapsApplied = 0;

  // Helper: build tonight-pairs from current S1+S2 state (excluding a specific S1 and S2 index)
  function buildTonightPairs(
    excludeS1Idx: number,
    excludeS2Idx: number
  ): Set<string> {
    const tp = new Set<string>(forbiddenPairs || []);
    for (let i = 0; i < newS1.length; i++) {
      if (i === excludeS1Idx) continue;
      tp.add(pairKey(newS1[i].teamAId, newS1[i].teamBId));
    }
    for (let i = 0; i < newS2.length; i++) {
      if (i === excludeS2Idx) continue;
      tp.add(pairKey(newS2[i].teamAId, newS2[i].teamBId));
    }
    return tp;
  }

  function makeMatch(slot: string, tA: Team, tB: Team): ScheduledMatch {
    return {
      slot,
      teamAId: tA.id,
      teamBId: tB.id,
      teamAName: tA.name,
      teamBName: tB.name,
      divisionA: tA.divisionName || 'Unknown',
      divisionB: tB.divisionName || 'Unknown',
      tierA: getTier(tA),
      tierB: getTier(tB),
    };
  }

  // For each S2 rematch, try to fix it by swapping with an S1 match
  for (const s2Idx of s2RematchIndices) {
    const s2m = newS2[s2Idx];
    // Check if this rematch was already fixed by a previous swap
    if (!playedSet.has(pairKey(s2m.teamAId, s2m.teamBId))) continue;

    const s2TeamX = teamMap.get(s2m.teamAId);
    const s2TeamY = teamMap.get(s2m.teamBId);
    if (!s2TeamX || !s2TeamY) continue;

    let fixed = false;

    // Try each S1 match as a swap candidate
    for (let s1Idx = 0; s1Idx < newS1.length && !fixed; s1Idx++) {
      const s1m = newS1[s1Idx];
      const s1TeamA = teamMap.get(s1m.teamAId);
      const s1TeamB = teamMap.get(s1m.teamBId);
      if (!s1TeamA || !s1TeamB) continue;

      // We want to rearrange so that X or Y gets a non-rematch partner from S1.
      // Try all 4 rearrangements of the 4 teams {A,B,X,Y} across S1 slot i and S2 slot j:
      //
      // Original: S1=(A,B), S2=(X,Y)  [X,Y is a rematch]
      // Option 1: S1=(A,Y), S2=(X,B)
      // Option 2: S1=(B,X), S2=(A,Y)  [but A,Y might be rematch too]
      // Option 3: S1=(A,X), S2=(B,Y)
      // Option 4: S1=(B,Y), S2=(A,X)

      const arrangements: [Team, Team, Team, Team][] = [
        [s1TeamA, s2TeamY, s2TeamX, s1TeamB], // S1=(A,Y), S2=(X,B)
        [s1TeamB, s2TeamX, s1TeamA, s2TeamY], // S1=(B,X), S2=(A,Y)
        [s1TeamA, s2TeamX, s1TeamB, s2TeamY], // S1=(A,X), S2=(B,Y)
        [s1TeamB, s2TeamY, s1TeamA, s2TeamX], // S1=(B,Y), S2=(A,X)
      ];

      for (const [newS1a, newS1b, newS2a, newS2b] of arrangements) {
        const newS1Key = pairKey(newS1a.id, newS1b.id);
        const newS2Key = pairKey(newS2a.id, newS2b.id);

        // Skip if the new S2 match is also a season rematch
        if (playedSet.has(newS2Key)) continue;

        // Skip if the new S1 match is a season rematch (don't move the problem)
        if (playedSet.has(newS1Key)) continue;

        // Build tonight-pairs excluding the two matches we're replacing
        const tp = buildTonightPairs(s1Idx, s2Idx);

        // Check that the new pairs don't conflict with session rematches or tier limits
        if (
          !canPlay(newS1a, newS1b, playedSet, tp, maxTierGap, relaxationLevel) ||
          !canPlay(newS2a, newS2b, playedSet, tp, maxTierGap, relaxationLevel)
        ) {
          continue;
        }

        // Apply the swap
        newS1[s1Idx] = makeMatch(slot1, newS1a, newS1b);
        newS2[s2Idx] = makeMatch(slot2, newS2a, newS2b);
        swapsApplied++;
        fixed = true;

        scheduleLog(
          `Rematch-aware swap: S1 (${s1TeamA.name},${s1TeamB.name})→(${newS1a.name},${newS1b.name}), ` +
            `S2 (${s2TeamX.name},${s2TeamY.name})→(${newS2a.name},${newS2b.name})`
        );
        break;
      }
    }
  }

  if (swapsApplied === 0) return null;

  return { s1: newS1, s2: newS2, swapsApplied };
}

export interface GreedySchedulerResult {
  matches: ScheduledMatch[];
  // New pairs created in this call (for tracking across multiple blocks)
  newPairs: Set<string>;
  // Diagnostic info about constraint relaxation applied
  diagnostics: {
    relaxationApplied: RelaxationLevel;
    constraintsRelaxed: string[];
    repairAttempted: boolean;
  };
}

/**
 * Main greedy scheduler function
 */
export function generateScheduleGreedy(input: GreedySchedulerInput): ScheduledMatch[] {
  const result = generateScheduleGreedyWithTracking(input);
  return result.matches;
}

/**
 * Attempt repair pass to match remaining unmatched teams
 */
function attemptRepairPass(
  unmatchedTeams: Team[],
  allTeams: Team[],
  slot: string,
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  teamMatchCounts: Map<string, number>,
  maxTierGap: number,
  newPairs: Set<string>,
  relaxationLevel: RelaxationLevel
): ScheduledMatch[] {
  const repairMatches: ScheduledMatch[] = [];

  // Sort unmatched teams by fewest available opponents (most constrained first)
  const sortedUnmatched = [...unmatchedTeams].sort((a, b) => {
    const aOpponents = allTeams.filter(
      (t) => t.id !== a.id && canPlay(a, t, playedSet, tonightPairs, maxTierGap, relaxationLevel)
    ).length;
    const bOpponents = allTeams.filter(
      (t) => t.id !== b.id && canPlay(b, t, playedSet, tonightPairs, maxTierGap, relaxationLevel)
    ).length;
    return aOpponents - bOpponents;
  });

  const pairedInRepair = new Set<string>();

  for (const team of sortedUnmatched) {
    if (pairedInRepair.has(team.id)) continue;

    // Find teams that also need matches and can play this team
    const candidates = sortedUnmatched.filter(
      (t) =>
        t.id !== team.id &&
        !pairedInRepair.has(t.id) &&
        canPlay(team, t, playedSet, tonightPairs, maxTierGap, relaxationLevel)
    );

    if (candidates.length === 0) continue;

    // Pick the first valid candidate
    const opponent = candidates[0];

    const match: ScheduledMatch = {
      slot,
      teamAId: team.id,
      teamBId: opponent.id,
      teamAName: team.name,
      teamBName: opponent.name,
      divisionA: team.divisionName || 'Unknown',
      divisionB: opponent.divisionName || 'Unknown',
      tierA: getTier(team),
      tierB: getTier(opponent),
    };

    repairMatches.push(match);
    pairedInRepair.add(team.id);
    pairedInRepair.add(opponent.id);

    const matchKey = pairKey(team.id, opponent.id);
    tonightPairs.add(matchKey);
    newPairs.add(matchKey);

    teamMatchCounts.set(team.id, (teamMatchCounts.get(team.id) || 0) + 1);
    teamMatchCounts.set(opponent.id, (teamMatchCounts.get(opponent.id) || 0) + 1);
  }

  return repairMatches;
}

/**
 * Main greedy scheduler function with pair tracking
 * Use this when scheduling multiple blocks with double header teams
 *
 * Enhanced with:
 * - Pre-validation to detect constraint issues
 * - Progressive constraint relaxation
 * - Repair pass for unmatched teams
 */
export function generateScheduleGreedyWithTracking(
  input: GreedySchedulerInput
): GreedySchedulerResult {
  const { teams, historyPairs, slots, thirdSlot, config, forbiddenPairs } = input;
  const maxTierGap = config?.maxTierGap ?? MAX_TIER_GAP;
  const byeStrategy = config?.byeStrategy ?? DEFAULT_BYE_STRATEGY;

  // Build played set from season history
  const playedSet = new Set<string>();
  for (const [idA, idB] of historyPairs) {
    playedSet.add(pairKey(idA, idB));
  }

  // Sort teams by constraint pressure (fewest valid opponents first)
  // This ensures most constrained teams get paired first
  const baseTonightPairs = new Set<string>(forbiddenPairs || []);
  const sortedTeams = [...teams].sort((a, b) => {
    // Count valid opponents for each team
    const aOpponents = teams.filter(
      (t) => t.id !== a.id && canPlay(a, t, playedSet, baseTonightPairs, maxTierGap, 0)
    ).length;
    const bOpponents = teams.filter(
      (t) => t.id !== b.id && canPlay(b, t, playedSet, baseTonightPairs, maxTierGap, 0)
    ).length;

    // Most constrained (fewest opponents) first
    if (aOpponents !== bOpponents) return aOpponents - bOpponents;

    // Fall back to tier, then name for stability
    const tierA = getTier(a);
    const tierB = getTier(b);
    if (tierA !== tierB) return tierA - tierB;
    return a.name.localeCompare(b.name);
  });

  const [slot1, slot2] = slots;
  const isOdd = teams.length % 2 === 1;

  // Pre-validation: check if scheduling is feasible with current constraints
  const feasibility = analyzeGreedyFeasibility(
    sortedTeams,
    playedSet,
    baseTonightPairs,
    maxTierGap
  );
  let relaxationLevel: RelaxationLevel = feasibility.recommendedLevel;

  if (!feasibility.isFeasible) {
    const relaxationNames: Record<RelaxationLevel, string> = {
      0: 'none',
      1: 'allow season rematches',
      2: 'allow cross-tier matches',
      3: 'full relaxation',
    };
    scheduleLog(
      `Constraint pre-check: ${feasibility.atRiskTeams.length} teams at risk. ` +
        `Applying relaxation level ${relaxationLevel} (${relaxationNames[relaxationLevel]})`
    );
  }

  // Track diagnostics
  const diagnostics: GreedySchedulerResult['diagnostics'] = {
    relaxationApplied: relaxationLevel,
    constraintsRelaxed: [],
    repairAttempted: false,
  };

  if (relaxationLevel >= 1) diagnostics.constraintsRelaxed.push('season_rematches');
  if (relaxationLevel >= 2) diagnostics.constraintsRelaxed.push('tier_constraints');

  // Initialize tonightPairs with forbidden pairs (from other blocks)
  const tonightPairs = new Set<string>(forbiddenPairs || []);
  const newPairs = new Set<string>();
  const teamMatchCounts = new Map<string, number>();

  if (!isOdd) {
    // ============ EVEN TEAM COUNT ============
    scheduleLog(`Scheduling ${teams.length} teams (even) for slots ${slot1} and ${slot2}`);

    // Generate S1 pairings with current relaxation level
    let s1Matches = generateSlotPairings(
      sortedTeams,
      slot1,
      playedSet,
      tonightPairs,
      teamMatchCounts,
      maxTierGap,
      undefined,
      newPairs,
      relaxationLevel
    );

    // Generate S2 pairings
    let s2Matches = generateSlotPairings(
      sortedTeams,
      slot2,
      playedSet,
      tonightPairs,
      teamMatchCounts,
      maxTierGap,
      undefined,
      newPairs,
      relaxationLevel
    );

    // Check if we have the expected number of matches
    const expectedMatches = teams.length; // N teams = N matches (N/2 per slot)
    let allMatches = [...s1Matches, ...s2Matches];

    // Cross-slot swap: if S2 has unmatched teams, try rearranging S1
    // to free up pairings that S2 needs, before falling through to relaxation
    // Fix 4: Also trigger when relaxation level > 0 (try to find level 0 solution first)
    if (allMatches.length < expectedMatches) {
      const crossSlotResult = tryCrossSlotSwap(
        s1Matches,
        s2Matches,
        sortedTeams,
        slot1,
        slot2,
        playedSet,
        forbiddenPairs,
        maxTierGap,
        relaxationLevel
      );

      if (crossSlotResult) {
        s1Matches = crossSlotResult.s1;
        s2Matches = crossSlotResult.s2;

        // Rebuild tonightPairs and match counts from the new S1+S2
        tonightPairs.clear();
        forbiddenPairs?.forEach((p) => tonightPairs.add(p));
        newPairs.clear();
        teamMatchCounts.clear();

        for (const m of [...s1Matches, ...s2Matches]) {
          const mk = pairKey(m.teamAId, m.teamBId);
          tonightPairs.add(mk);
          newPairs.add(mk);
          teamMatchCounts.set(m.teamAId, (teamMatchCounts.get(m.teamAId) || 0) + 1);
          teamMatchCounts.set(m.teamBId, (teamMatchCounts.get(m.teamBId) || 0) + 1);
        }

        allMatches = [...s1Matches, ...s2Matches];
      }
    }

    // If we don't have enough matches, try progressive relaxation
    while (allMatches.length < expectedMatches && relaxationLevel < 3) {
      relaxationLevel = (relaxationLevel + 1) as RelaxationLevel;
      diagnostics.relaxationApplied = relaxationLevel;
      if (relaxationLevel === 1) diagnostics.constraintsRelaxed.push('season_rematches');
      if (relaxationLevel === 2) diagnostics.constraintsRelaxed.push('tier_constraints');

      scheduleLog(
        `Only ${allMatches.length}/${expectedMatches} matches created. ` +
          `Retrying with relaxation level ${relaxationLevel}`
      );

      // Reset and retry
      tonightPairs.clear();
      forbiddenPairs?.forEach((p) => tonightPairs.add(p));
      newPairs.clear();
      teamMatchCounts.clear();

      s1Matches = generateSlotPairings(
        sortedTeams,
        slot1,
        playedSet,
        tonightPairs,
        teamMatchCounts,
        maxTierGap,
        undefined,
        newPairs,
        relaxationLevel
      );

      s2Matches = generateSlotPairings(
        sortedTeams,
        slot2,
        playedSet,
        tonightPairs,
        teamMatchCounts,
        maxTierGap,
        undefined,
        newPairs,
        relaxationLevel
      );

      allMatches = [...s1Matches, ...s2Matches];
    }

    // Rematch-aware cross-slot optimization: even if all teams are matched,
    // check if S2 used season rematches and try to fix them by rearranging S1
    const rematchSwapResult = tryRematchAwareSwap(
      s1Matches,
      s2Matches,
      sortedTeams,
      slot1,
      slot2,
      playedSet,
      forbiddenPairs,
      maxTierGap,
      relaxationLevel
    );

    if (rematchSwapResult) {
      s1Matches = rematchSwapResult.s1;
      s2Matches = rematchSwapResult.s2;

      // Rebuild tonightPairs and match counts from the optimized S1+S2
      tonightPairs.clear();
      forbiddenPairs?.forEach((p) => tonightPairs.add(p));
      newPairs.clear();
      teamMatchCounts.clear();

      for (const m of [...s1Matches, ...s2Matches]) {
        const mk = pairKey(m.teamAId, m.teamBId);
        tonightPairs.add(mk);
        newPairs.add(mk);
        teamMatchCounts.set(m.teamAId, (teamMatchCounts.get(m.teamAId) || 0) + 1);
        teamMatchCounts.set(m.teamBId, (teamMatchCounts.get(m.teamBId) || 0) + 1);
      }

      allMatches = [...s1Matches, ...s2Matches];
      scheduleLog(
        `Rematch-aware optimization: resolved ${rematchSwapResult.swapsApplied} S2 rematch(es)`
      );
    }

    // If still missing matches, attempt repair pass
    if (allMatches.length < expectedMatches) {
      diagnostics.repairAttempted = true;

      // Find teams that don't have matches in each slot
      const s1TeamIds = new Set(s1Matches.flatMap((m) => [m.teamAId, m.teamBId]));
      const s2TeamIds = new Set(s2Matches.flatMap((m) => [m.teamAId, m.teamBId]));

      const unmatchedInS1 = sortedTeams.filter((t) => !s1TeamIds.has(t.id));
      const unmatchedInS2 = sortedTeams.filter((t) => !s2TeamIds.has(t.id));

      if (unmatchedInS1.length >= 2) {
        scheduleLog(
          `Attempting repair pass for ${unmatchedInS1.length} unmatched teams in ${slot1}`
        );
        const repairS1 = attemptRepairPass(
          unmatchedInS1,
          sortedTeams,
          slot1,
          playedSet,
          tonightPairs,
          teamMatchCounts,
          maxTierGap,
          newPairs,
          3 // Use full relaxation for repair
        );
        s1Matches.push(...repairS1);
      }

      if (unmatchedInS2.length >= 2) {
        scheduleLog(
          `Attempting repair pass for ${unmatchedInS2.length} unmatched teams in ${slot2}`
        );
        const repairS2 = attemptRepairPass(
          unmatchedInS2,
          sortedTeams,
          slot2,
          playedSet,
          tonightPairs,
          teamMatchCounts,
          maxTierGap,
          newPairs,
          3 // Use full relaxation for repair
        );
        s2Matches.push(...repairS2);
      }

      allMatches = [...s1Matches, ...s2Matches];
    }

    // Final validation
    const matchCountsArray = Array.from(teamMatchCounts.values());
    const allHaveTwoMatches = matchCountsArray.every((count) => count === 2);

    if (!allHaveTwoMatches) {
      warnLog('Warning: Not all teams have exactly 2 matches', Object.fromEntries(teamMatchCounts));
    }

    scheduleLog(
      `Generated ${allMatches.length} matches (${s1Matches.length} in ${slot1}, ${s2Matches.length} in ${slot2})` +
        (diagnostics.relaxationApplied > 0
          ? ` [relaxation: ${diagnostics.constraintsRelaxed.join(', ')}]`
          : '')
    );

    return { matches: allMatches, newPairs, diagnostics };
  } else {
    // ============ ODD TEAM COUNT ============
    scheduleLog(
      `Scheduling ${teams.length} teams (odd) for slots ${slot1}, ${slot2}, and ${thirdSlot || 'S3'}`
    );

    // Select Bye1 for S1
    const bye1 = pickBye(
      sortedTeams,
      byeStrategy,
      playedSet,
      maxTierGap,
      new Set(),
      relaxationLevel
    );
    scheduleLog(`Selected Bye1: ${bye1.name} (sits out ${slot1})`);

    // Generate S1 pairings (excluding Bye1)
    const s1Matches = generateSlotPairings(
      sortedTeams,
      slot1,
      playedSet,
      tonightPairs,
      teamMatchCounts,
      maxTierGap,
      bye1.id,
      newPairs,
      relaxationLevel
    );

    // Select Bye2 for S2 (must be different from Bye1 and able to play Bye1)
    let bye2: Team | null = null;
    const excludeForBye2 = new Set([bye1.id]);

    // Try to find a valid Bye2 with progressive relaxation
    for (let attempt = 0; attempt < sortedTeams.length && !bye2; attempt++) {
      const candidate = pickBye(
        sortedTeams,
        byeStrategy,
        playedSet,
        maxTierGap,
        excludeForBye2,
        relaxationLevel
      );

      if (canPlay(bye1, candidate, playedSet, tonightPairs, maxTierGap, relaxationLevel)) {
        bye2 = candidate;
      } else {
        excludeForBye2.add(candidate.id);
      }
    }

    if (!bye2) {
      // Emergency fallback with full relaxation
      bye2 = sortedTeams.find(
        (t) => t.id !== bye1.id && canPlay(bye1, t, playedSet, tonightPairs, maxTierGap, 3)
      );
      if (!bye2) {
        bye2 = sortedTeams.find((t) => t.id !== bye1.id) || sortedTeams[0];
      }
      warnLog(`Could not find ideal Bye2, using fallback: ${bye2.name}`);
    } else {
      scheduleLog(`Selected Bye2: ${bye2.name} (sits out ${slot2})`);
    }

    // Generate S2 pairings (excluding Bye2)
    const s2Matches = generateSlotPairings(
      sortedTeams,
      slot2,
      playedSet,
      tonightPairs,
      teamMatchCounts,
      maxTierGap,
      bye2.id,
      newPairs,
      relaxationLevel
    );

    // Check if we need repair pass for odd teams
    const expectedMatchesPerSlot = Math.floor((teams.length - 1) / 2);
    if (s1Matches.length < expectedMatchesPerSlot || s2Matches.length < expectedMatchesPerSlot) {
      diagnostics.repairAttempted = true;

      const s1TeamIds = new Set([bye1.id, ...s1Matches.flatMap((m) => [m.teamAId, m.teamBId])]);
      const s2TeamIds = new Set([bye2.id, ...s2Matches.flatMap((m) => [m.teamAId, m.teamBId])]);

      const unmatchedInS1 = sortedTeams.filter((t) => !s1TeamIds.has(t.id));
      const unmatchedInS2 = sortedTeams.filter((t) => !s2TeamIds.has(t.id));

      if (unmatchedInS1.length >= 2) {
        const repairS1 = attemptRepairPass(
          unmatchedInS1,
          sortedTeams,
          slot1,
          playedSet,
          tonightPairs,
          teamMatchCounts,
          maxTierGap,
          newPairs,
          3
        );
        s1Matches.push(...repairS1);
      }

      if (unmatchedInS2.length >= 2) {
        const repairS2 = attemptRepairPass(
          unmatchedInS2,
          sortedTeams,
          slot2,
          playedSet,
          tonightPairs,
          teamMatchCounts,
          maxTierGap,
          newPairs,
          3
        );
        s2Matches.push(...repairS2);
      }
    }

    // Generate S3 match: Bye1 vs Bye2
    const slot3Name = thirdSlot || 'S3';
    const s3Match: ScheduledMatch = {
      slot: slot3Name,
      teamAId: bye1.id,
      teamBId: bye2.id,
      teamAName: bye1.name,
      teamBName: bye2.name,
      divisionA: bye1.divisionName || 'Unknown',
      divisionB: bye2.divisionName || 'Unknown',
      tierA: getTier(bye1),
      tierB: getTier(bye2),
    };

    const s3PairKey = pairKey(bye1.id, bye2.id);
    tonightPairs.add(s3PairKey);
    newPairs.add(s3PairKey);
    teamMatchCounts.set(bye1.id, (teamMatchCounts.get(bye1.id) || 0) + 1);
    teamMatchCounts.set(bye2.id, (teamMatchCounts.get(bye2.id) || 0) + 1);

    const allMatches = [...s1Matches, ...s2Matches, s3Match];

    // Validation
    const matchCountsArray = Array.from(teamMatchCounts.values());
    const allHaveTwoMatches = matchCountsArray.every((count) => count === 2);

    if (!allHaveTwoMatches) {
      warnLog('Warning: Not all teams have exactly 2 matches', Object.fromEntries(teamMatchCounts));
    }

    scheduleLog(
      `Generated ${allMatches.length} matches (${s1Matches.length} in ${slot1}, ${s2Matches.length} in ${slot2}, 1 in ${slot3Name})` +
        (diagnostics.relaxationApplied > 0
          ? ` [relaxation: ${diagnostics.constraintsRelaxed.join(', ')}]`
          : '')
    );
    scheduleLog(`Bye1 (${bye1.name}) plays in ${slot2} + ${slot3Name}`);
    scheduleLog(`Bye2 (${bye2.name}) plays in ${slot1} + ${slot3Name}`);

    return { matches: allMatches, newPairs, diagnostics };
  }
}

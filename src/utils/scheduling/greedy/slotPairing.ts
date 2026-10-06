import { Team } from '@/types';
import { scheduleLog, warnLog } from '@/utils/logger';

import { canPlay, getTier } from './constraints';
import { findBestOpponent } from './opponentSelection';
import { pairKey } from './pairKey';
import { RelaxationLevel, ScheduledMatch } from './types';

/** State shared by every step of the swap pass. */
export interface SwapContext {
  slotName: string;
  playedSet: Set<string>;
  tonightPairs: Set<string>;
  teamMatchCounts: Map<string, number>;
  maxTierGap: number;
  newPairs: Set<string> | undefined;
  relaxationLevel: RelaxationLevel;
  rematchAllowedFor?: Set<string>;
}

type TeamPair = [Team, Team];

function buildMatch(slotName: string, teamA: Team, teamB: Team): ScheduledMatch {
  return {
    slot: slotName,
    teamAId: teamA.id,
    teamBId: teamB.id,
    teamAName: teamA.name,
    teamBName: teamB.name,
    divisionA: teamA.divisionName || 'Unknown',
    divisionB: teamB.divisionName || 'Unknown',
    tierA: getTier(teamA),
    tierB: getTier(teamB),
  };
}

function canPlayInContext(teamA: Team, teamB: Team, ctx: SwapContext): boolean {
  return canPlay(
    teamA,
    teamB,
    ctx.playedSet,
    ctx.tonightPairs,
    ctx.maxTierGap,
    ctx.relaxationLevel,
    ctx.rematchAllowedFor
  );
}

/** Mark a pair as played tonight and add one match to each team's count. */
function recordPair(teamA: Team, teamB: Team, ctx: SwapContext): void {
  const key = pairKey(teamA.id, teamB.id);
  ctx.tonightPairs.add(key);
  if (ctx.newPairs) ctx.newPairs.add(key);
  ctx.teamMatchCounts.set(teamA.id, (ctx.teamMatchCounts.get(teamA.id) || 0) + 1);
  ctx.teamMatchCounts.set(teamB.id, (ctx.teamMatchCounts.get(teamB.id) || 0) + 1);
}

/** Undo `recordPair` for a match that the swap pass breaks up. */
function releasePair(teamA: Team, teamB: Team, ctx: SwapContext): void {
  const key = pairKey(teamA.id, teamB.id);
  ctx.tonightPairs.delete(key);
  if (ctx.newPairs) ctx.newPairs.delete(key);
  ctx.teamMatchCounts.set(teamA.id, (ctx.teamMatchCounts.get(teamA.id) || 1) - 1);
  ctx.teamMatchCounts.set(teamB.id, (ctx.teamMatchCounts.get(teamB.id) || 1) - 1);
}

/** Pair stranded teams with each other when they are allowed to play. */
function pairUnmatchedDirectly(
  unmatchedTeams: Team[],
  stillUnmatched: Set<string>,
  result: ScheduledMatch[],
  ctx: SwapContext
): void {
  for (let i = 0; i < unmatchedTeams.length; i++) {
    if (!stillUnmatched.has(unmatchedTeams[i].id)) continue;
    for (let j = i + 1; j < unmatchedTeams.length; j++) {
      if (!stillUnmatched.has(unmatchedTeams[j].id)) continue;
      const u1 = unmatchedTeams[i];
      const u2 = unmatchedTeams[j];
      if (!canPlayInContext(u1, u2, ctx)) continue;
      result.push(buildMatch(ctx.slotName, u1, u2));
      recordPair(u1, u2, ctx);
      stillUnmatched.delete(u1.id);
      stillUnmatched.delete(u2.id);
    }
  }
}

/**
 * Break match `index` (existing = [A, B]) into `first` + `second`.
 * `first` replaces the old match. `second` is added at the end.
 */
function applySwap(
  result: ScheduledMatch[],
  index: number,
  existing: TeamPair,
  first: TeamPair,
  second: TeamPair,
  ctx: SwapContext
): void {
  releasePair(existing[0], existing[1], ctx);
  result[index] = buildMatch(ctx.slotName, first[0], first[1]);
  recordPair(first[0], first[1], ctx);
  result.push(buildMatch(ctx.slotName, second[0], second[1]));
  recordPair(second[0], second[1], ctx);
  scheduleLog(
    `Swap fix: replaced (${existing[0].name} vs ${existing[1].name}) with (${first[0].name} vs ${first[1].name}) + (${second[0].name} vs ${second[1].name})`
  );
}

/**
 * Try to place stranded teams U1 and U2 into one existing match (A, B).
 * Option 1 is (U1,A) + (U2,B). Option 2 is (U1,B) + (U2,A).
 * Returns true when a swap was applied.
 */
function trySwapIntoExistingMatch(
  u1: Team,
  u2: Team,
  result: ScheduledMatch[],
  teamMap: Map<string, Team>,
  ctx: SwapContext
): boolean {
  for (let k = 0; k < result.length; k++) {
    const teamA = teamMap.get(result[k].teamAId);
    const teamB = teamMap.get(result[k].teamBId);
    if (!teamA || !teamB) continue;

    const options: TeamPair[] = [
      [teamA, teamB],
      [teamB, teamA],
    ];
    for (const [x, y] of options) {
      if (canPlayInContext(u1, x, ctx) && canPlayInContext(u2, y, ctx)) {
        applySwap(result, k, [teamA, teamB], [u1, x], [u2, y], ctx);
        return true;
      }
    }
  }
  return false;
}

/**
 * Swap pass: when the greedy left teams unmatched (because their only remaining
 * opponent is a blocked pair), try swapping them into an existing match.
 *
 * For each pair of unmatched teams (U1, U2) that can't play each other,
 * find an existing match M=(A,B) where we can swap to (U1,A)+(U2,B)
 * or (U1,B)+(U2,A), resolving the stranding without creating new conflicts.
 */
// Exported so tests can reach the direct-pairing step, which generateSlotPairings
// never hits: a team only ends up stranded when it cannot play any open team.
export function trySwapToFixUnmatched(
  matches: ScheduledMatch[],
  unmatchedTeams: Team[],
  allTeams: Team[],
  ctx: SwapContext
): ScheduledMatch[] {
  const result = [...matches];
  const stillUnmatched = new Set(unmatchedTeams.map((t) => t.id));
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  // Try to pair unmatched teams directly first
  pairUnmatchedDirectly(unmatchedTeams, stillUnmatched, result, ctx);

  if (stillUnmatched.size < 2) return result;

  // For remaining unmatched pairs, try swapping with existing matches
  const unmatchedArr = allTeams.filter((t) => stillUnmatched.has(t.id));
  for (let i = 0; i < unmatchedArr.length - 1; i++) {
    if (!stillUnmatched.has(unmatchedArr[i].id)) continue;
    for (let j = i + 1; j < unmatchedArr.length; j++) {
      if (!stillUnmatched.has(unmatchedArr[j].id)) continue;
      const u1 = unmatchedArr[i];
      const u2 = unmatchedArr[j];

      if (trySwapIntoExistingMatch(u1, u2, result, teamMap, ctx)) {
        stillUnmatched.delete(u1.id);
        stillUnmatched.delete(u2.id);
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
export function generateSlotPairings(
  teams: Team[],
  slotName: string,
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  teamMatchCounts: Map<string, number>,
  maxTierGap: number,
  byeTeamId?: string,
  newPairs?: Set<string>,
  relaxationLevel: RelaxationLevel = 0,
  rematchAllowedFor?: Set<string>
): ScheduledMatch[] {
  const matches: ScheduledMatch[] = [];
  const pairedInSlot = new Set<string>();
  // Per-team rematch allowances accrued in this slot. Shared with caller (if
  // provided) so the orchestrator can track diagnostics across slots.
  const slotRematchAllowed = rematchAllowedFor ?? new Set<string>();

  if (byeTeamId) {
    pairedInSlot.add(byeTeamId);
  }

  for (const team of teams) {
    if (pairedInSlot.has(team.id)) continue;

    const availableCandidates = teams.filter((t) => !pairedInSlot.has(t.id));
    let opponent = findBestOpponent(
      team,
      availableCandidates,
      playedSet,
      tonightPairs,
      teamMatchCounts,
      maxTierGap,
      relaxationLevel,
      availableCandidates, // pass all unpaired teams for constraint-aware tie-breaking
      slotRematchAllowed
    );

    // Per-team escalation: if no opponent at the current (strict) constraints,
    // grant *just this team* permission to take a season rematch and retry once.
    // This avoids slot-wide level-2 escalation that would cascade rematches into
    // other teams that still had fresh opponents available.
    if (!opponent && relaxationLevel < 2 && !slotRematchAllowed.has(team.id)) {
      slotRematchAllowed.add(team.id);
      opponent = findBestOpponent(
        team,
        availableCandidates,
        playedSet,
        tonightPairs,
        teamMatchCounts,
        maxTierGap,
        relaxationLevel,
        availableCandidates,
        slotRematchAllowed
      );
    }

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
    return trySwapToFixUnmatched(matches, unmatchedTeams, teams, {
      slotName,
      playedSet,
      tonightPairs,
      teamMatchCounts,
      maxTierGap,
      newPairs,
      relaxationLevel,
      rematchAllowedFor: slotRematchAllowed,
    });
  }

  return matches;
}

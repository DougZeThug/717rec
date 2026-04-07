import { Team } from '@/types';
import { scheduleLog, warnLog } from '@/utils/logger';
import { canPlay, getTier } from './constraints';
import { findBestOpponent } from './opponentSelection';
import { pairKey } from './pairKey';
import { RelaxationLevel, ScheduledMatch } from './types';

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
  relaxationLevel: RelaxationLevel,
  rematchAllowedFor?: Set<string>
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
      if (canPlay(u1, u2, playedSet, tonightPairs, maxTierGap, relaxationLevel, rematchAllowedFor)) {
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
          canPlay(u1, teamA, playedSet, tonightPairs, maxTierGap, relaxationLevel, rematchAllowedFor) &&
          canPlay(u2, teamB, playedSet, tonightPairs, maxTierGap, relaxationLevel, rematchAllowedFor)
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
          canPlay(u1, teamB, playedSet, tonightPairs, maxTierGap, relaxationLevel, rematchAllowedFor) &&
          canPlay(u2, teamA, playedSet, tonightPairs, maxTierGap, relaxationLevel, rematchAllowedFor)
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
      relaxationLevel,
      slotRematchAllowed
    );
    return swapResult;
  }

  return matches;
}

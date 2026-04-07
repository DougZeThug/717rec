import { Team } from '@/types';
import { scheduleLog } from '@/utils/logger';
import { canPlay, getTier } from './constraints';
import { pairKey } from './pairKey';
import { generateSlotPairings } from './slotPairing';
import { RelaxationLevel, ScheduledMatch } from './types';

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
export function tryCrossSlotSwap(
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
 * Attempt repair pass to match remaining unmatched teams
 */
export function attemptRepairPass(
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

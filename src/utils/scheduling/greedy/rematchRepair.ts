import { Team } from '@/types';
import { scheduleLog } from '@/utils/logger';

import { canPlay, getTier } from './constraints';
import { pairKey } from './pairKey';
import { ScheduledMatch } from './types';

/**
 * After greedy slot generation, scan the slot for any pair that is a season
 * rematch and try to 2-swap it with another pair so both replacements are
 * fresh (not in playedSet). Forbidden/session pairs and tier gap stay hard.
 *
 * Mutates `matches` in place and updates `tonightPairs` / `newPairs`.
 * Returns the number of rematches eliminated.
 */
export function rematchRepairPass(
  matches: ScheduledMatch[],
  slotName: string,
  allTeams: Team[],
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  newPairs: Set<string>,
  maxTierGap: number
): number {
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));
  let repaired = 0;

  // Only consider matches in this slot
  const slotIdxs: number[] = [];
  for (let k = 0; k < matches.length; k++) {
    if (matches[k].slot === slotName) slotIdxs.push(k);
  }

  for (let ii = 0; ii < slotIdxs.length; ii++) {
    const i = slotIdxs[ii];
    const m1 = matches[i];
    const key1 = pairKey(m1.teamAId, m1.teamBId);
    if (!playedSet.has(key1)) continue; // not a rematch, skip

    const teamA = teamMap.get(m1.teamAId);
    const teamB = teamMap.get(m1.teamBId);
    if (!teamA || !teamB) continue;

    let swapped = false;
    for (let jj = 0; jj < slotIdxs.length && !swapped; jj++) {
      if (ii === jj) continue;
      const j = slotIdxs[jj];
      const m2 = matches[j];
      const key2 = pairKey(m2.teamAId, m2.teamBId);
      const teamC = teamMap.get(m2.teamAId);
      const teamD = teamMap.get(m2.teamBId);
      if (!teamC || !teamD) continue;

      // Try (teamA,teamC) + (teamB,teamD) and (teamA,teamD) + (teamB,teamC)
      const rearrangements: [Team, Team, Team, Team][] = [
        [teamA, teamC, teamB, teamD],
        [teamA, teamD, teamB, teamC],
      ];

      for (const [p1a, p1b, p2a, p2b] of rearrangements) {
        const newKey1 = pairKey(p1a.id, p1b.id);
        const newKey2 = pairKey(p2a.id, p2b.id);

        // Both replacements must be fresh (no season rematch)
        if (playedSet.has(newKey1) || playedSet.has(newKey2)) continue;

        // Build a temporary tonightPairs without the two pairs being broken
        const temp = new Set(tonightPairs);
        temp.delete(key1);
        temp.delete(key2);

        // canPlay enforces forbiddenPairs (still in temp) and session rematches.
        if (!canPlay(p1a, p1b, playedSet, temp, maxTierGap, 0)) continue;
        // After adding newKey1 to temp, check second pair against it too
        temp.add(newKey1);
        if (!canPlay(p2a, p2b, playedSet, temp, maxTierGap, 0)) continue;

        // Apply the swap
        tonightPairs.delete(key1);
        tonightPairs.delete(key2);
        tonightPairs.add(newKey1);
        tonightPairs.add(newKey2);
        if (newPairs.has(key1)) {
          newPairs.delete(key1);
          newPairs.add(newKey1);
        }
        if (newPairs.has(key2)) {
          newPairs.delete(key2);
          newPairs.add(newKey2);
        }

        matches[i] = {
          slot: slotName,
          teamAId: p1a.id,
          teamBId: p1b.id,
          teamAName: p1a.name,
          teamBName: p1b.name,
          divisionA: p1a.divisionName || 'Unknown',
          divisionB: p1b.divisionName || 'Unknown',
          tierA: getTier(p1a),
          tierB: getTier(p1b),
        };
        matches[j] = {
          slot: slotName,
          teamAId: p2a.id,
          teamBId: p2b.id,
          teamAName: p2a.name,
          teamBName: p2b.name,
          divisionA: p2a.divisionName || 'Unknown',
          divisionB: p2b.divisionName || 'Unknown',
          tierA: getTier(p2a),
          tierB: getTier(p2b),
        };

        repaired++;
        swapped = true;
        scheduleLog(
          `Rematch repair (${slotName}): (${teamA.name} vs ${teamB.name}) + (${teamC.name} vs ${teamD.name}) → ` +
            `(${p1a.name} vs ${p1b.name}) + (${p2a.name} vs ${p2b.name})`
        );
        break;
      }
    }
  }

  return repaired;
}

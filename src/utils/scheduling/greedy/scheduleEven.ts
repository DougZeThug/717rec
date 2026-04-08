import { Team } from '@/types';
import { scheduleLog, warnLog } from '@/utils/logger';

import { pairKey } from './pairKey';
import { rematchRepairPass } from './rematchRepair';
import { generateSlotPairings } from './slotPairing';
import { attemptRepairPass, tryCrossSlotSwap } from './swapRepair';
import { GreedySchedulerResult, RelaxationLevel, ScheduledMatch } from './types';

export interface EvenScheduleArgs {
  teams: Team[];
  sortedTeams: Team[];
  slot1: string;
  slot2: string;
  playedSet: Set<string>;
  tonightPairs: Set<string>;
  newPairs: Set<string>;
  teamMatchCounts: Map<string, number>;
  forbiddenPairs: Set<string> | undefined;
  maxTierGap: number;
  relaxationLevel: RelaxationLevel;
  perTeamRematchAllowed: Set<string>;
  diagnostics: GreedySchedulerResult['diagnostics'];
}

export function scheduleEven(args: EvenScheduleArgs): {
  matches: ScheduledMatch[];
  relaxationLevel: RelaxationLevel;
} {
  const {
    teams,
    sortedTeams,
    slot1,
    slot2,
    playedSet,
    tonightPairs,
    newPairs,
    teamMatchCounts,
    forbiddenPairs,
    maxTierGap,
    perTeamRematchAllowed,
    diagnostics,
  } = args;
  let { relaxationLevel } = args;

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
    relaxationLevel,
    perTeamRematchAllowed
  );
  diagnostics.rematchesRepaired += rematchRepairPass(
    s1Matches,
    slot1,
    sortedTeams,
    playedSet,
    tonightPairs,
    newPairs,
    maxTierGap
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
    relaxationLevel,
    perTeamRematchAllowed
  );
  diagnostics.rematchesRepaired += rematchRepairPass(
    s2Matches,
    slot2,
    sortedTeams,
    playedSet,
    tonightPairs,
    newPairs,
    maxTierGap
  );

  // Check if we have the expected number of matches
  const expectedMatches = teams.length; // N teams = N matches (N/2 per slot)
  let allMatches = [...s1Matches, ...s2Matches];

  // Cross-slot swap: if S2 has unmatched teams at level 0, try rearranging S1
  // to free up pairings that S2 needs, before falling through to relaxation
  if (allMatches.length < expectedMatches && relaxationLevel === 0) {
    const crossSlotResult = tryCrossSlotSwap(
      s1Matches,
      s2Matches,
      sortedTeams,
      slot1,
      slot2,
      playedSet,
      forbiddenPairs,
      maxTierGap,
      relaxationLevel,
      perTeamRematchAllowed
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
    if (relaxationLevel === 1) diagnostics.constraintsRelaxed.push('tier_constraints');
    if (relaxationLevel === 2) diagnostics.constraintsRelaxed.push('season_rematches');

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
      relaxationLevel,
      perTeamRematchAllowed
    );
    diagnostics.rematchesRepaired += rematchRepairPass(
      s1Matches,
      slot1,
      sortedTeams,
      playedSet,
      tonightPairs,
      newPairs,
      maxTierGap
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
      relaxationLevel,
      perTeamRematchAllowed
    );
    diagnostics.rematchesRepaired += rematchRepairPass(
      s2Matches,
      slot2,
      sortedTeams,
      playedSet,
      tonightPairs,
      newPairs,
      maxTierGap
    );

    allMatches = [...s1Matches, ...s2Matches];
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
      scheduleLog(`Attempting repair pass for ${unmatchedInS1.length} unmatched teams in ${slot1}`);
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
      scheduleLog(`Attempting repair pass for ${unmatchedInS2.length} unmatched teams in ${slot2}`);
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
    `Generated ${allMatches.length} matches (${s1Matches.length} in ${slot1}, ${s2Matches.length} in ${slot2})${diagnostics.relaxationApplied > 0 ? ` [relaxation: ${diagnostics.constraintsRelaxed.join(', ')}]` : ''}`
  );

  return { matches: allMatches, relaxationLevel };
}

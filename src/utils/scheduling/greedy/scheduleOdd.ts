import { Team } from '@/types';
import { scheduleLog, warnLog } from '@/utils/logger';

import { pickBye } from './byeSelection';
import { canPlay, getTier } from './constraints';
import { pairKey } from './pairKey';
import { rematchRepairPass } from './rematchRepair';
import { generateSlotPairings } from './slotPairing';
import { attemptRepairPass } from './swapRepair';
import { ByeStrategy, GreedySchedulerResult, RelaxationLevel, ScheduledMatch } from './types';

export interface OddScheduleArgs {
  teams: Team[];
  sortedTeams: Team[];
  slot1: string;
  slot2: string;
  thirdSlot: string | undefined;
  playedSet: Set<string>;
  tonightPairs: Set<string>;
  newPairs: Set<string>;
  teamMatchCounts: Map<string, number>;
  forbiddenPairs?: Set<string>;
  maxTierGap: number;
  byeStrategy: ByeStrategy;
  relaxationLevel: RelaxationLevel;
  perTeamRematchAllowed: Set<string>;
  diagnostics: GreedySchedulerResult['diagnostics'];
}

export function scheduleOdd(args: OddScheduleArgs): ScheduledMatch[] {
  const {
    teams,
    sortedTeams,
    slot1,
    slot2,
    thirdSlot,
    playedSet,
    tonightPairs,
    newPairs,
    teamMatchCounts,
    forbiddenPairs,
    maxTierGap,
    byeStrategy,
    perTeamRematchAllowed,
    diagnostics,
  } = args;
  let { relaxationLevel } = args;

  // ============ ODD TEAM COUNT ============
  scheduleLog(
    `Scheduling ${teams.length} teams (odd) for slots ${slot1}, ${slot2}, and ${thirdSlot || 'S3'}`
  );

  // Select Bye1 for S1
  let bye1 = pickBye(sortedTeams, byeStrategy, playedSet, maxTierGap, new Set(), relaxationLevel);
  scheduleLog(`Selected Bye1: ${bye1.name} (sits out ${slot1})`);

  // Generate S1 pairings (excluding Bye1)
  let s1Matches = generateSlotPairings(
    sortedTeams,
    slot1,
    playedSet,
    tonightPairs,
    teamMatchCounts,
    maxTierGap,
    bye1.id,
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
    bye2 =
      sortedTeams.find(
        (t) => t.id !== bye1.id && canPlay(bye1, t, playedSet, tonightPairs, maxTierGap, 3)
      ) ?? null;
    if (!bye2) {
      bye2 = sortedTeams.find((t) => t.id !== bye1.id) || sortedTeams[0];
    }
    warnLog(`Could not find ideal Bye2, using fallback: ${bye2.name}`);
  } else {
    scheduleLog(`Selected Bye2: ${bye2.name} (sits out ${slot2})`);
  }

  // Generate S2 pairings (excluding Bye2)
  let s2Matches = generateSlotPairings(
    sortedTeams,
    slot2,
    playedSet,
    tonightPairs,
    teamMatchCounts,
    maxTierGap,
    bye2.id,
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

  const expectedMatchesPerSlot = Math.floor((teams.length - 1) / 2);

  // Progressive relaxation retry: regenerate slot pairings (and re-pick byes)
  // at increasing relaxation levels when either slot is short. Mirrors
  // scheduleEven's retry loop so the orchestrator pre-check doesn't strand
  // odd-team schedules at a too-strict level.
  while (
    (s1Matches.length < expectedMatchesPerSlot || s2Matches.length < expectedMatchesPerSlot) &&
    relaxationLevel < 3
  ) {
    relaxationLevel = (relaxationLevel + 1) as RelaxationLevel;
    diagnostics.relaxationApplied = relaxationLevel;
    if (relaxationLevel === 1) diagnostics.constraintsRelaxed.push('tier_constraints');
    if (relaxationLevel === 2) diagnostics.constraintsRelaxed.push('season_rematches');

    scheduleLog(
      `Odd: only ${s1Matches.length}+${s2Matches.length}/${expectedMatchesPerSlot * 2} slot matches. ` +
        `Retrying with relaxation level ${relaxationLevel}`
    );

    // Reset shared state, re-seeding tonightPairs from forbiddenPairs
    tonightPairs.clear();
    forbiddenPairs?.forEach((p) => tonightPairs.add(p));
    newPairs.clear();
    teamMatchCounts.clear();

    // Re-pick byes at the new relaxation level (bye selection itself depends on it)
    bye1 = pickBye(sortedTeams, byeStrategy, playedSet, maxTierGap, new Set(), relaxationLevel);

    bye2 = null;
    const excludeRetry = new Set([bye1.id]);
    for (let attempt = 0; attempt < sortedTeams.length && !bye2; attempt++) {
      const candidate = pickBye(
        sortedTeams,
        byeStrategy,
        playedSet,
        maxTierGap,
        excludeRetry,
        relaxationLevel
      );
      if (canPlay(bye1, candidate, playedSet, tonightPairs, maxTierGap, relaxationLevel)) {
        bye2 = candidate;
      } else {
        excludeRetry.add(candidate.id);
      }
    }
    if (!bye2) {
      bye2 =
        sortedTeams.find(
          (t) => t.id !== bye1.id && canPlay(bye1, t, playedSet, tonightPairs, maxTierGap, 3)
        ) ||
        sortedTeams.find((t) => t.id !== bye1.id) ||
        sortedTeams[0];
    }

    s1Matches = generateSlotPairings(
      sortedTeams,
      slot1,
      playedSet,
      tonightPairs,
      teamMatchCounts,
      maxTierGap,
      bye1.id,
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
      bye2.id,
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
  }

  // Final safety net: repair pass for any still-unmatched teams
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
    `Generated ${allMatches.length} matches (${s1Matches.length} in ${slot1}, ${s2Matches.length} in ${slot2}, 1 in ${slot3Name})${diagnostics.relaxationApplied > 0 ? ` [relaxation: ${diagnostics.constraintsRelaxed.join(', ')}]` : ''}`
  );
  scheduleLog(`Bye1 (${bye1.name}) plays in ${slot2} + ${slot3Name}`);
  scheduleLog(`Bye2 (${bye2.name}) plays in ${slot1} + ${slot3Name}`);

  return allMatches;
}

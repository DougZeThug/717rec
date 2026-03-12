import {
  AlgorithmConfig,
  SchedulingDiagnostics,
  TeamPairing,
  TeamPairingMap,
  TimeBlockTeamsMap,
} from '@/types/autoSchedule';
import { getBackToBackPair, getPairConfig } from '@/utils/autoSchedule/constants';
import { errorLog, scheduleLog, warnLog } from '@/utils/logger';
import { generateScheduleGreedyWithTracking, pairKey } from '@/utils/scheduling/greedyBackToBackScheduler';

/**
 * Schedules team pairings using the greedy back-to-back algorithm for dual match mode.
 *
 * This function handles consecutive timeslots (S1, S2, optional S3) and is optimized
 * for dual match mode scheduling. It tracks cross-block opponents for double header teams
 * and ensures no team plays the same opponent in multiple blocks.
 *
 * @param timeBlockTeams - Map of time block names to teams
 * @param config - Algorithm configuration
 * @param blockMap - Maps team ID to array of block names (supports double headers)
 * @param historyPairs - Pre-fetched season history pairs
 * @param toast - Toast notification function for user feedback
 * @returns Pairings, unmatched team IDs, and diagnostics
 */
export const scheduleDualBlockPairings = async (
  timeBlockTeams: TimeBlockTeamsMap,
  config: AlgorithmConfig,
  blockMap: Record<string, string[]>,
  historyPairs: [string, string][],
  toast: (options: { title: string; description: string; variant?: 'destructive' }) => void
): Promise<{
  pairings: TeamPairingMap;
  unmatchedTeamIds: string[];
  diagnostics: SchedulingDiagnostics;
}> => {
  scheduleLog('Using greedy back-to-back scheduler for dual match mode');

  const pairings: TeamPairingMap = {};
  const allUnmatchedTeamIds: string[] = [];
  // Track diagnostics from all scheduler calls
  const aggregateDiagnostics: SchedulingDiagnostics = {
    relaxationApplied: 0,
    constraintsRelaxed: [],
    repairAttempted: false,
  };

  // Find all pairs with teams
  const pairsWithTeams = Object.keys(timeBlockTeams).filter(
    (pairName) => timeBlockTeams[pairName]?.length > 0
  );

  if (pairsWithTeams.length === 0) {
    toast({
      title: 'No Teams Found',
      description: 'Please load teams for a specific date first.',
      variant: 'destructive',
    });
    throw new Error('No teams found in any time blocks');
  }

  scheduleLog(
    `Processing ${pairsWithTeams.length} back-to-back pairs: ${pairsWithTeams.join(', ')}`
  );

  // 🔒 Cross-block opponent tracking for double header teams
  // This Set tracks all pairs created across ALL blocks in this session
  // Prevents double header teams from playing the same opponent in multiple blocks
  const sessionPairs = new Set<string>();

  // Process each back-to-back pair, passing sessionPairs to prevent duplicate opponents
  for (const pairName of pairsWithTeams) {
    const pairTeams = timeBlockTeams[pairName];
    if (!pairTeams || pairTeams.length === 0) continue;

    const pairConfig = getPairConfig(pairName);
    if (!pairConfig) {
      errorLog(`Invalid pair configuration for: ${pairName}`);
      continue;
    }

    // Get the specific timeslots for this pair
    const slots: [string, string] = [pairConfig.primary, pairConfig.secondary];
    // For odd teams, use the next slot after secondary (or fallback to secondary if none exists)
    const thirdSlot = getBackToBackPair(pairConfig.secondary) || pairConfig.secondary;

    scheduleLog(`Scheduling ${pairName} pair (${pairTeams.length} teams):`);
    scheduleLog(`   Timeslots: ${slots[0]} and ${slots[1]}`);

    // Log team tier assignments for this pair
    scheduleLog(`   Team Tier Assignments:`);
    pairTeams.forEach((team) => {
      const divisionName = (team.divisionName || '').toLowerCase();
      let tier = 2; // default
      if (divisionName.includes('competitive')) tier = 1;
      if (divisionName.includes('intermediate')) tier = 2;
      if (divisionName.includes('recreational')) tier = 3;
      scheduleLog(`     - ${team.name}: "${team.divisionName}" → Tier ${tier}`);
    });

    // Generate schedule for this specific pair with its specific timeslots
    // Pass sessionPairs as forbiddenPairs to prevent double header teams
    // from playing the same opponent in multiple blocks
    const schedulerResult = generateScheduleGreedyWithTracking({
      teams: pairTeams,
      historyPairs,
      slots,
      thirdSlot,
      config: {
        maxTierGap: 1,
        byeStrategy: 'last',
      },
      forbiddenPairs: sessionPairs,
    });

    const scheduledMatches = schedulerResult.matches;
    const { diagnostics } = schedulerResult;

    // Aggregate diagnostics from this scheduler call
    if (diagnostics.relaxationApplied > aggregateDiagnostics.relaxationApplied) {
      aggregateDiagnostics.relaxationApplied = diagnostics.relaxationApplied;
    }
    if (diagnostics.repairAttempted) {
      aggregateDiagnostics.repairAttempted = true;
    }
    diagnostics.constraintsRelaxed.forEach((c) => {
      if (!aggregateDiagnostics.constraintsRelaxed.includes(c)) {
        aggregateDiagnostics.constraintsRelaxed.push(c);
      }
    });

    // Add new pairs to sessionPairs for cross-block tracking
    schedulerResult.newPairs.forEach((pair) => sessionPairs.add(pair));

    // Log diagnostics if relaxation was applied
    if (diagnostics.relaxationApplied > 0) {
      scheduleLog(
        `   ⚠️ Constraint relaxation applied for ${pairName}: level ${diagnostics.relaxationApplied} ` +
          `(${diagnostics.constraintsRelaxed.join(', ')})`
      );
    }
    if (diagnostics.repairAttempted) {
      scheduleLog(`   🔧 Repair pass was needed for ${pairName}`);
    }

    scheduleLog(
      `   Generated ${scheduledMatches.length} matches for ${pairName} (${schedulerResult.newPairs.size} new pairs, ${sessionPairs.size} total session pairs)`
    );

    // Convert scheduled matches to TeamPairingMap format
    for (const match of scheduledMatches) {
      const team1 = pairTeams.find((t) => t.id === match.teamAId);
      const team2 = pairTeams.find((t) => t.id === match.teamBId);

      if (!team1 || !team2) {
        warnLog(`Could not find teams for match: ${match.teamAId} vs ${match.teamBId}`);
        continue;
      }

      // 🛡️ DEFENSIVE VALIDATION: Ensure both teams share the current block
      // Teams can be in multiple blocks (double headers), so we check if both
      // teams have the current pairName in their block list
      const team1Blocks = blockMap[match.teamAId] || [];
      const team2Blocks = blockMap[match.teamBId] || [];

      const team1InCurrentBlock = team1Blocks.includes(pairName);
      const team2InCurrentBlock = team2Blocks.includes(pairName);

      if (!team1InCurrentBlock || !team2InCurrentBlock) {
        errorLog(`CROSS-BLOCK MATCH DETECTED:
  Team A: ${team1.name} (Blocks: ${team1Blocks.join(', ')})
  Team B: ${team2.name} (Blocks: ${team2Blocks.join(', ')})
  Expected Block: ${pairName}
  Timeslot: ${match.slot}`);
        continue; // Skip this invalid match
      }

      const pairing: TeamPairing = {
        team1,
        team2,
        compatibilityScore: match.tierA === match.tierB ? 10.0 : 5.0,
        hasPlayedBefore: false,
      };

      // Use the actual timeslot from the match (not the pair name)
      const timeslotKey = match.slot;
      if (!pairings[timeslotKey]) {
        pairings[timeslotKey] = [];
      }
      pairings[timeslotKey].push(pairing);
    }

    // Track unmatched teams for this pair
    const pairedTeamIds = new Set<string>();
    scheduledMatches.forEach((match) => {
      pairedTeamIds.add(match.teamAId);
      pairedTeamIds.add(match.teamBId);
    });

    const unmatchedInPair = pairTeams
      .filter((team) => !pairedTeamIds.has(team.id))
      .map((team) => team.id);

    if (unmatchedInPair.length > 0) {
      warnLog(`   Warning: ${unmatchedInPair.length} teams unmatched in ${pairName}`);
      allUnmatchedTeamIds.push(...unmatchedInPair);
    }
  }

  scheduleLog(
    `Total matches generated: ${Object.values(pairings).reduce((sum, p) => sum + p.length, 0)}`
  );
  scheduleLog(`   Timeslots used: ${Object.keys(pairings).join(', ')}`);

  return {
    pairings,
    unmatchedTeamIds: allUnmatchedTeamIds,
    diagnostics: aggregateDiagnostics,
  };
};

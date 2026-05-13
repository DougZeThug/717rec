import { AlgorithmConfig, TeamPairingMap, TimeBlockTeamsMap } from '@/types/autoSchedule';
import { generatePairingsWithBlossom } from '@/utils/autoSchedule/blossomPairingAlgorithm';
import { calculateDivisionOnlyCompatibility } from '@/utils/autoSchedule/compatibilityUtils';
import { haveTeamsPlayedBefore } from '@/utils/autoSchedule/matchHistoryService';
import { scheduleLog, warnLog } from '@/utils/logger';

/**
 * Schedules team pairings using the standard Edmonds' Blossom algorithm.
 *
 * This function processes each time block independently, maximizing compatibility scores
 * and supporting quality optimization weights. It's ideal for single-block scheduling
 * where each time slot is treated separately.
 *
 * @param timeBlockTeams - Map of time block names to teams
 * @param config - Algorithm configuration
 * @param historyPairs - Pre-fetched season history pairs
 * @returns Pairings and unmatched team IDs
 */
export const scheduleStandardPairings = async (
  timeBlockTeams: TimeBlockTeamsMap,
  config: AlgorithmConfig,
  historyPairs: [string, string][]
): Promise<{ pairings: TeamPairingMap; unmatchedTeamIds: string[] }> => {
  const pairings: TeamPairingMap = {};
  let allUnmatchedTeamIds: string[] = [];

  scheduleLog(`Pre-fetched season history: ${historyPairs.length} pairs`);

  // Build Set for O(1) lookup
  const playedPairsSet = new Set<string>();
  historyPairs.forEach(([team1Id, team2Id]) => {
    const pairingKey = [team1Id, team2Id].sort().join('-');
    playedPairsSet.add(pairingKey);
  });

  for (const [block, teamsInBlock] of Object.entries(timeBlockTeams)) {
    // Skip empty blocks
    if (!teamsInBlock || teamsInBlock.length < 2) {
      scheduleLog(`Skipping empty block: ${block}`);
      continue;
    }

    // Skip blocks with odd number of teams (warn the user)
    if (teamsInBlock.length % 2 !== 0) {
      warnLog(
        `Block ${block} has odd number of teams (${teamsInBlock.length}). One team will be unmatched.`
      );
    }

    // Generate pairings for this time block
    scheduleLog(`Generating pairings for ${block} block with ${teamsInBlock.length} teams`);
    const blockPairings = await generatePairingsWithBlossom(teamsInBlock, {
      avoidRematches: config.avoidRematches,
      haveTeamsPlayedFn: haveTeamsPlayedBefore,
      getCompatibilityScoreFn: calculateDivisionOnlyCompatibility,
      weights: config.weights,
      playedPairsSet: playedPairsSet,
    });

    // Store pairings for this block
    pairings[block] = blockPairings;

    // Update playedPairsSet so subsequent blocks avoid same-session rematches (double headers)
    blockPairings.forEach((pair) => {
      const pairingKey = [pair.team1.id, pair.team2.id].sort().join('-');
      playedPairsSet.add(pairingKey);
    });

    // Find unmatched teams. Blossom targets 2 matches per team; flag any team
    // that didn't reach the target (not just zero-match teams) so partial
    // schedules are surfaced instead of appearing complete.
    const TARGET_MATCHES = 2;
    const matchCounts = new Map<string, number>();
    teamsInBlock.forEach((t) => matchCounts.set(t.id, 0));
    blockPairings.forEach((pair) => {
      matchCounts.set(pair.team1.id, (matchCounts.get(pair.team1.id) ?? 0) + 1);
      matchCounts.set(pair.team2.id, (matchCounts.get(pair.team2.id) ?? 0) + 1);
    });

    const blockUnmatchedTeams = teamsInBlock
      .filter((team) => (matchCounts.get(team.id) ?? 0) < TARGET_MATCHES)
      .map((team) => team.id);

    const partialTeams = teamsInBlock.filter((team) => {
      const count = matchCounts.get(team.id) ?? 0;
      return count > 0 && count < TARGET_MATCHES;
    });
    if (partialTeams.length > 0) {
      warnLog(
        `Block ${block} has ${partialTeams.length} team(s) with fewer than ${TARGET_MATCHES} matches: ` +
          partialTeams
            .map((t) => `${t.name} (${matchCounts.get(t.id) ?? 0}/${TARGET_MATCHES})`)
            .join(', ')
      );
    }

    allUnmatchedTeamIds = [...allUnmatchedTeamIds, ...blockUnmatchedTeams];
  }

  return {
    pairings,
    unmatchedTeamIds: allUnmatchedTeamIds,
  };
};

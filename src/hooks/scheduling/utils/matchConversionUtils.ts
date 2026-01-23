import { TeamPairingMap } from '@/types/autoSchedule';
import { TIME_BLOCKS } from '@/utils/autoSchedule/constants';
import { errorLog, scheduleLog, warnLog } from '@/utils/logger';

/**
 * Converts team pairings into match objects with timeslots assigned.
 * Supports both standard single-block and dual-match mode scheduling.
 */
export const convertPairingsToMatches = (
  pairings: TeamPairingMap,
  date: Date,
  options: { dualMatchMode?: boolean } = {}
): {
  id: string;
  team1Id: string;
  team2Id: string;
  timeslot: string;
  blockType?: 'primary' | 'secondary';
}[] => {
  if (!pairings || !date) {
    warnLog('Missing pairings or date in convertPairingsToMatches');
    return [];
  }

  const matches = [];
  const blocks = Object.keys(pairings);

  // Special handling for dual match mode
  if (options.dualMatchMode && blocks.length >= 2) {
    const primaryBlock = blocks[0]; // Usually 'Early'
    const secondaryBlock = blocks[1]; // Usually 'Late'

    scheduleLog(`Processing dual match mode with blocks: ${primaryBlock} and ${secondaryBlock}`);

    // Track teams and their opponents to ensure no duplicates
    const teamOpponents: Record<string, string[]> = {};

    // First handle primary block
    if (pairings[primaryBlock]?.length > 0) {
      pairings[primaryBlock].forEach((pairing, index) => {
        // Use primary block's main timeslot (typically 6:30 PM)
        const timeslot = TIME_BLOCKS[primaryBlock].main;

        // Initialize opponent tracking for both teams
        if (!teamOpponents[pairing.team1.id]) teamOpponents[pairing.team1.id] = [];
        if (!teamOpponents[pairing.team2.id]) teamOpponents[pairing.team2.id] = [];

        // Record opponents
        teamOpponents[pairing.team1.id].push(pairing.team2.id);
        teamOpponents[pairing.team2.id].push(pairing.team1.id);

        // Create match
        matches.push({
          id: Date.now().toString() + '-' + primaryBlock + '-' + index,
          team1Id: pairing.team1.id,
          team2Id: pairing.team2.id,
          timeslot,
          blockType: 'primary',
        });
      });
    }

    // Then handle secondary block
    if (pairings[secondaryBlock]?.length > 0) {
      pairings[secondaryBlock].forEach((pairing, index) => {
        // Use secondary block's secondary timeslot (typically 7:00 PM)
        const timeslot = TIME_BLOCKS[secondaryBlock].secondary;

        // Initialize opponent tracking for any new teams
        if (!teamOpponents[pairing.team1.id]) teamOpponents[pairing.team1.id] = [];
        if (!teamOpponents[pairing.team2.id]) teamOpponents[pairing.team2.id] = [];

        // Record opponents
        teamOpponents[pairing.team1.id].push(pairing.team2.id);
        teamOpponents[pairing.team2.id].push(pairing.team1.id);

        // Create match
        matches.push({
          id: Date.now().toString() + '-' + secondaryBlock + '-' + index,
          team1Id: pairing.team1.id,
          team2Id: pairing.team2.id,
          timeslot,
          blockType: 'secondary',
        });
      });
    }

    // Log any teams with duplicate opponents (playing the same team in both blocks)
    const teamsWithDuplicates = Object.entries(teamOpponents)
      .filter(([_, opponents]) => {
        const uniqueOpponents = new Set(opponents);
        return uniqueOpponents.size < opponents.length;
      })
      .map(([teamId]) => teamId);

    if (teamsWithDuplicates.length > 0) {
      warnLog(
        `Warning: ${teamsWithDuplicates.length} teams have duplicate opponents in dual blocks`
      );
    }
  } else {
    // Standard single-block processing
    Object.entries(pairings).forEach(([block, blockPairings]) => {
      // Ensure we can access the TIME_BLOCKS for this block
      if (!TIME_BLOCKS[block]) {
        errorLog(`Missing time block data for ${block}`);
        return;
      }

      blockPairings.forEach((pairing, index) => {
        // In standard mode, alternate between main and secondary timeslots
        const timeslot = index % 2 === 0 ? TIME_BLOCKS[block].main : TIME_BLOCKS[block].secondary;

        matches.push({
          id: Date.now().toString() + '-' + block + '-' + index,
          team1Id: pairing.team1.id,
          team2Id: pairing.team2.id,
          timeslot,
        });
      });
    });
  }

  return matches;
};

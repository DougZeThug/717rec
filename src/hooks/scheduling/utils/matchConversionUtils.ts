import { TeamPairingMap } from '@/types/autoSchedule';
import { TIME_BLOCKS } from '@/utils/autoSchedule/constants';
import { errorLog, warnLog } from '@/utils/logger';

/**
 * Converts team pairings into match objects with timeslots assigned.
 */
export const convertPairingsToMatches = (
  pairings: TeamPairingMap,
  date: Date
): {
  id: string;
  team1Id: string;
  team2Id: string;
  timeslot: string;
}[] => {
  if (!pairings || !date) {
    warnLog('Missing pairings or date in convertPairingsToMatches');
    return [];
  }

  const matches: {
    id: string;
    team1Id: string;
    team2Id: string;
    timeslot: string;
  }[] = [];

  // Standard single-block processing
  Object.entries(pairings).forEach(([block, blockPairings]) => {
    // Ensure we can access the TIME_BLOCKS for this block
    if (!TIME_BLOCKS[block as keyof typeof TIME_BLOCKS]) {
      errorLog(`Missing time block data for ${block}`);
      return;
    }

    blockPairings.forEach((pairing, index) => {
      // In standard mode, alternate between main and secondary timeslots
      const timeslot =
        index % 2 === 0
          ? TIME_BLOCKS[block as keyof typeof TIME_BLOCKS].main
          : TIME_BLOCKS[block as keyof typeof TIME_BLOCKS].secondary;

      matches.push({
        id: Date.now().toString() + '-' + block + '-' + index,
        team1Id: pairing.team1.id,
        team2Id: pairing.team2.id,
        timeslot,
      });
    });
  });

  return matches;
};

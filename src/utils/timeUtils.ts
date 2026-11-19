import { Match } from '@/types';

import { extractTimeSlotFromUTC } from './timezone';

/**
 * Groups an array of matches by time slot.
 *
 * @param matches An array of Match objects to group.
 * @returns An object where the keys are time slots and the values are arrays of Match objects.
 */
export const groupMatchesByTimeSlot = (matches: Match[]): { [timeSlot: string]: Match[] } => {
  return matches.reduce((acc: { [timeSlot: string]: Match[] }, match: Match) => {
    // Use our utility to extract time slot from UTC date
    const timeSlot = match.date ? extractTimeSlotFromUTC(match.date) : 'No Time';

    if (!acc[timeSlot]) {
      acc[timeSlot] = [];
    }

    acc[timeSlot].push(match);
    return acc;
  }, {});
};

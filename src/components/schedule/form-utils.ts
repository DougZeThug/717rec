import type { Match } from '@/types';
import { timezoneLog } from '@/utils/logger';
import { createUTCDateWithTime, formatUTCToLocalTimeString } from '@/utils/timezone';

import type { MatchFormValues } from './types';

/**
 * Format a date object for use in an HTML date input
 */
export const formatDateForInput = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Parse an HTML date input value (yyyy-MM-dd) as a local date
 * This avoids timezone issues caused by new Date() parsing date-only strings as UTC
 */
export const parseDateFromInput = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // Local date at midnight
};

/**
 * Create a date with the selected time slot, properly converted to UTC for storage
 */
export const createDateWithTime = (date: Date, timeSlot: string | null): Date => {
  if (!timeSlot) {
    timezoneLog('No time slot provided, returning date with default time');
    return date;
  }

  timezoneLog('Creating date with time:', {
    date: date.toString(),
    timeSlot,
    action: 'Converting to UTC for storage',
  });

  // Use our fixed utility to handle time conversion properly
  const utcDate = createUTCDateWithTime(date, timeSlot);

  // Add extra validation logging
  timezoneLog('Time conversion complete:', {
    originalTimeSlot: timeSlot,
    resultTime: utcDate.toISOString(),
    utcHours: utcDate.getUTCHours(),
    utcMinutes: utcDate.getUTCMinutes(),
  });

  return utcDate;
};

/**
 * Get time slot from a date object, converting from UTC to local time
 */
export const getTimeSlotFromDate = (date: Date): string | null => {
  return formatUTCToLocalTimeString(date);
};

/**
 * Calculate winner and loser IDs based on team scores
 *
 * Internal to this module: buildMatchSubmission below is the only caller, and
 * the form sends its payload through that.
 */
const determineMatchOutcome = (
  isCompleted: boolean,
  team1Id: string,
  team2Id: string,
  team1Score: number | undefined,
  team2Score: number | undefined
): { winnerId: string | null; loserId: string | null } => {
  if (!isCompleted || team1Score === undefined || team2Score === undefined) {
    return { winnerId: null, loserId: null };
  }

  if (team1Score > team2Score) {
    return { winnerId: team1Id, loserId: team2Id };
  } else if (team2Score > team1Score) {
    return { winnerId: team2Id, loserId: team1Id };
  }

  return { winnerId: null, loserId: null };
};

/**
 * Why these values cannot be saved, or null when they can.
 *
 * Equal scores give determineMatchOutcome no winner, and nothing downstream can
 * store a completed match without one: the result writers are atomic RPCs gated
 * on a winner and a loser, and the plain update excludes iscompleted by type. A
 * save used to write the date and the teams, drop the completion without a
 * word, and still report success.
 *
 * The wording stays on what the admin can do. The unresolved-matches queue only
 * confirms a tie that already exists, so sending them there would be a dead
 * end: nothing in the app can put a match into that state.
 */
export const describeUnsavableMatch = (values: MatchFormValues): string | null => {
  if (values.isCompleted && values.team1Score === values.team2Score) {
    return 'A completed match needs a winner. Change a score, or leave the match open.';
  }
  return null;
};

/**
 * Turn the form's values into the payload the create and update paths take.
 *
 * Scores and the winner ride along only on a completed match, so reopening one
 * clears them rather than leaving a stale result behind.
 */
export const buildMatchSubmission = (values: MatchFormValues): Omit<Match, 'id'> => {
  const dateWithTime = createDateWithTime(values.date, values.timeSlot);
  const { winnerId, loserId } = determineMatchOutcome(
    values.isCompleted,
    values.team1Id,
    values.team2Id,
    values.team1Score,
    values.team2Score
  );

  return {
    team1Id: values.team1Id,
    team2Id: values.team2Id,
    date: dateWithTime.toISOString(),
    iscompleted: values.isCompleted,
    team1Score: values.isCompleted ? values.team1Score : undefined,
    team2Score: values.isCompleted ? values.team2Score : undefined,
    winnerId: winnerId ?? undefined,
    loserId: loserId ?? undefined,
    timeSlot: values.timeSlot,
  };
};

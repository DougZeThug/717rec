import type { Match } from '@/types';
import { formatLeagueTimeString, getLeagueCalendarDate } from '@/utils/timezone';
import { createDateWithTime } from '@/utils/timezone/createDateWithTime';

import type { MatchFormValues } from './types';

/**
 * Parse an HTML date input value (yyyy-MM-dd) as a local date
 * This avoids timezone issues caused by new Date() parsing date-only strings as UTC
 */
export const parseDateFromInput = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // Local date at midnight
};

/**
 * The league time slot a stored instant represents.
 *
 * League time, not the reader's: the slot is the one an admin picked from the
 * form's list, and it has to read back as the same slot for an admin in any
 * timezone or no button matches and the form looks broken.
 */
export const getTimeSlotFromDate = (date: Date): string | null => {
  return formatLeagueTimeString(date);
};

/**
 * The form's date field for a match that is already stored.
 *
 * The field's convention is a local Date whose year/month/day are the LEAGUE
 * calendar day, so a stored instant has to be read in league time first: an
 * 8:30 PM Eastern match is stored on the next UTC day, and the form would
 * otherwise open an admin east of the league on the night after the one being
 * edited.
 *
 * An unreadable stored date falls back to today, the way create mode does.
 */
export const leagueDayFromStoredDate = (stored: string): Date => {
  const instant = new Date(stored);
  if (Number.isNaN(instant.getTime())) return new Date();

  const { year, month, day } = getLeagueCalendarDate(instant);
  return new Date(year, month - 1, day);
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

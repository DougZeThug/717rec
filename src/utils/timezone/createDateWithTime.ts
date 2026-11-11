import { timezoneLog } from '@/utils/logger';
import { getLeagueTimeUtc, parseTimeString } from '@/utils/timezone';

/**
 * Format a date object for use in an HTML date input
 */
const formatDateForInput = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Combine a chosen night with a league time slot into the UTC instant to store.
 *
 * The convention every caller keeps: the Date passed in carries the intended
 * LEAGUE calendar day in its local year/month/day, and its time of day is
 * ignored. A time slot is a league wall-clock time, so the instant is built in
 * league time.
 *
 * It used to be built with setHours on the *browser's* clock, which only agreed
 * with the league for an admin sitting in Eastern. A Pacific admin saving a
 * 7:30 PM match stored 10:30 PM league time, on the first save, with nothing
 * anywhere reporting it.
 */
export const createDateWithTime = (date: Date, timeSlot: string | null): Date => {
  if (!timeSlot) {
    timezoneLog('No time slot provided, returning date with default time');
    return date;
  }

  const { hours, minutes } = parseTimeString(timeSlot);
  const utcDate = getLeagueTimeUtc(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    hours,
    minutes
  );

  timezoneLog('Time conversion complete:', {
    leagueDay: formatDateForInput(date),
    originalTimeSlot: timeSlot,
    resultTime: utcDate.toISOString(),
  });

  return utcDate;
};

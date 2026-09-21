import { errorLog, timezoneLog } from '@/utils/logger';

import { formatTimeString } from './formatters';
import { DateRange } from './types';

const LEAGUE_TIME_ZONE = 'America/New_York';

/**
 * Return the calendar date (year/month/day) of an instant as seen in league
 * time (America/New_York). Use this whenever "which day did this match happen"
 * matters — an 8 PM EST match is stored as the next UTC day.
 */
export const getLeagueCalendarDate = (date: Date): { year: number; month: number; day: number } => {
  // en-CA formats as YYYY-MM-DD.
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: LEAGUE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .split('-')
    .map(Number);

  return { year, month, day };
};

/**
 * Return the UTC instant for a league-time (America/New_York) wall clock on the
 * given calendar date. Month is 1-based; day values may overflow (e.g. day 40)
 * and roll into the next month, matching Date.UTC semantics.
 *
 * The offset is measured at the target instant rather than assumed, so the same
 * 6:30 PM slot lands on 23:30Z in EST and on 22:30Z in EDT, and an 8:30 PM slot
 * correctly rolls into the next UTC day. US transitions happen in the early
 * hours UTC, never inside an evening slot's window, so one pass is exact.
 */
export const getLeagueTimeUtc = (
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0
): Date => {
  const naive = Date.UTC(year, month - 1, day, hours, minutes, 0);
  // Compute the offset of league time at that instant (e.g. +4h in EDT).
  // Use formatToParts to avoid re-parsing toLocaleString output in the runtime's local TZ.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: LEAGUE_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(naive));
  const getPart = (type: string): number => {
    const value = parts.find((part) => part.type === type)?.value;
    return value ? Number(value) : 0;
  };

  const localMs = Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour'),
    getPart('minute'),
    getPart('second')
  );

  return new Date(naive + (naive - localMs));
};

/**
 * Return the UTC instant of midnight (start of day) in league time for the
 * given calendar date.
 */
export const getLeagueMidnightUtc = (year: number, month: number, day: number): Date =>
  getLeagueTimeUtc(year, month, day);

/**
 * Read an instant's league-time wall clock as a '7:30 PM' string — the shape the
 * match form's slot buttons and the league's posted slots use.
 *
 * Deliberately separate from formatUTCToLocalTimeString, which reads the
 * *viewer's* clock and which extractTimeSlotFromUTC depends on for schedule
 * grouping. Only the admin match form uses this one, where the slot being edited
 * is a league time by definition. Keeping them apart is what stops a form fix
 * re-grouping the schedule for every reader outside Eastern.
 *
 * Built from formatToParts plus formatTimeString rather than from Intl's own
 * 12-hour output: some ICU builds separate the time from AM/PM with U+202F, and
 * that string would never equal the '7:30 PM' in the slot list.
 */
export const formatLeagueTimeString = (date: Date): string => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: LEAGUE_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const read = (type: string): number =>
      Number(parts.find((part) => part.type === type)?.value ?? NaN);

    // Some ICU builds report midnight as hour 24 under hour12: false.
    const hours = read('hour') % 24;
    const minutes = read('minute');
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return '';

    return formatTimeString(hours, minutes);
  } catch (error) {
    // Same contract as formatUTCToLocalTimeString: an unusable date gives ''.
    errorLog('Error formatting instant in league time:', error);
    return '';
  }
};

/**
 * Create a date range that includes the evening session
 * This ensures that evening matches (which may be stored as next-day UTC)
 * are included when filtering for a specific day
 */
export const createEveningAwareDateRange = (date: Date): DateRange => {
  // Create start date (the selected day at midnight UTC)
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Start at 00:00:00 of the selected day in UTC
  const startDate = new Date(Date.UTC(year, month, day, 0, 0, 0));

  // End at 23:59:59 of the NEXT day in UTC
  // This ensures we catch evening EST matches that fall into the next UTC day
  const endDate = new Date(Date.UTC(year, month, day + 1, 23, 59, 59));

  timezoneLog('Evening-aware date range', {
    selectedDate: date.toDateString(),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    startUTCHours: startDate.getUTCHours(),
    endUTCHours: endDate.getUTCHours(),
  });

  return { startDate, endDate };
};

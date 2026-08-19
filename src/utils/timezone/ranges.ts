import { timezoneLog } from '@/utils/logger';

import { DateRange } from './types';

const LEAGUE_TIME_ZONE = 'America/New_York';

/**
 * Return the calendar date (year/month/day) of an instant as seen in league
 * time (America/New_York). Use this whenever "which day did this match happen"
 * matters — an 8 PM EST match is stored as the next UTC day.
 */
export const getLeagueCalendarDate = (
  date: Date
): { year: number; month: number; day: number } => {
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
 * Return the UTC instant of midnight (start of day) in league time for the
 * given calendar date. Month is 1-based; day values may overflow (e.g. day 40)
 * and roll into the next month, matching Date.UTC semantics.
 */
export const getLeagueMidnightUtc = (year: number, month: number, day: number): Date => {
  const naive = Date.UTC(year, month - 1, day, 0, 0, 0);
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

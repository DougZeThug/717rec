import { errorLog, timezoneLog } from '@/utils/logger';

import { parseTimeString } from './parsers';

/**
 * Convert a local date to a UTC date
 * For storing in the database
 */
export const toUTCDate = (localDate: Date): Date => {
  return new Date(localDate.toISOString());
};

/**
 * Convert a UTC date to a local date
 * For displaying in the UI
 */
export const toLocalDate = (utcDate: Date | string): Date => {
  // If string is passed, convert to Date object
  const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(dateObj);
};

/*
 * createUTCDateWithTime and formatTimeToUTC used to live here. Both built the
 * stored instant with Date#setHours, which is the *browser's* wall clock, so a
 * match time only came out right for an admin sitting in the league's timezone.
 * The match form now uses getLeagueTimeUtc in ./ranges instead, which builds the
 * instant in league time, and nothing else called either function.
 *
 * They are deleted rather than left in place because the next caller would
 * reintroduce the same defect, and the dead-code gate could not see them: their
 * only remaining importer was their own test.
 */

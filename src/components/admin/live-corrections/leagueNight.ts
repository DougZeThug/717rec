import { format } from 'date-fns';

import { getLeagueCalendarDate } from '@/utils/timezone';

/**
 * The league night a match belongs to, as a sortable `YYYY-MM-DD` key.
 *
 * Match dates are stored as UTC instants and an 8 PM league game lands on the
 * *next* UTC day, so the night is read in league time rather than off the raw
 * instant. That also makes the key the same everywhere: a browser in UTC and a
 * browser in Eastern agree on which night a match was played.
 *
 * Returns null for a match with no usable date.
 */
export const leagueNightKey = (date?: string | null): string | null => {
  if (!date) return null;

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;

  const { year, month, day } = getLeagueCalendarDate(parsed);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/** A `leagueNightKey` written the way the cards and the date picker show it. */
export const formatLeagueNight = (key: string): string => {
  const [year, month, day] = key.split('-').map(Number);
  return format(new Date(year, month - 1, day), 'MMM d, yyyy');
};

/** The same key for the local-midnight Date `pickDefaultEntryDate` returns. */
export const localDateKey = (date: Date): string => format(date, 'yyyy-MM-dd');

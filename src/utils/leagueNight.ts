import { getLeagueCalendarDate } from '@/utils/timezone';

/**
 * League night is Thursday.
 *
 * The admin screens that set up a night — Match Creation and Timeslots — should
 * open on the night being planned rather than on today, which is usually a day
 * nobody plays. Today counts when today is Thursday.
 *
 * "Today" means today in league time (America/New_York), not in the browser's
 * timezone. The two disagree for exactly the hours that matter: at 8:30 PM
 * Eastern on a Thursday the session is in progress, but a UTC browser already
 * reads Friday, and Friday's answer is next week. Every admin has to land on
 * the same night wherever they are.
 *
 * Noon, not midnight: the date is later combined with a time of day, and a
 * midnight base is one daylight-saving hour away from becoming the day before.
 *
 * The result is built with the local Date constructor on purpose. Callers
 * format it as a local `yyyy-MM-dd` key to query and store `match_date`, so the
 * league day has to survive as that local calendar day.
 */
export const nextThursday = (from: Date = new Date()): Date => {
  const THURSDAY = 4;
  const { year, month, day } = getLeagueCalendarDate(from);
  const leagueDayOfWeek = new Date(year, month - 1, day).getDay();
  const daysAway = (THURSDAY - leagueDayOfWeek + 7) % 7;
  return new Date(year, month - 1, day + daysAway, 12, 0, 0, 0);
};

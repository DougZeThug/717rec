import { getLeagueCalendarDate, getLeagueTimeUtc } from '@/utils/timezone';

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

/** How often a page asks for fresh data while league night is under way. */
export const LIVE_REFETCH_MS = 60_000;

/** League night runs Thursday evening: when scores are being entered. */
const LEAGUE_NIGHT_START_HOUR = 16;

const LEAGUE_WEEKDAY_HOUR = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  hour: 'numeric',
  hour12: false,
});

/**
 * True from 4 PM on a Thursday, league time, to midnight.
 *
 * The league plays its night's matches in the evening, and scores arrive as they
 * finish. Outside those hours nothing changes minute to minute, so nothing needs
 * to poll. League time rather than the viewer's, so a visitor anywhere gets the
 * same answer.
 */
export const isLeagueNightNow = (now: Date = new Date()): boolean => {
  const parts = LEAGUE_WEEKDAY_HOUR.formatToParts(now);
  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  // Some ICU builds report midnight as hour 24.
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? NaN) % 24;
  return weekday === 'Thu' && hour >= LEAGUE_NIGHT_START_HOUR;
};

/** Longest wait before checking again whether league night has started. */
const MAX_IDLE_CHECK_MS = 60 * 60 * 1000;

/** The next 4 PM on a Thursday in league time, as an instant. */
const nextLeagueNightStart = (now: Date): Date => {
  const THURSDAY = 4;
  const { year, month, day } = getLeagueCalendarDate(now);
  const leagueDayOfWeek = new Date(year, month - 1, day).getDay();
  const daysAway = (THURSDAY - leagueDayOfWeek + 7) % 7;
  return getLeagueTimeUtc(year, month, day + daysAway, LEAGUE_NIGHT_START_HOUR, 0);
};

/**
 * `refetchInterval` for data that changes while matches are played.
 *
 * - On league night: every minute.
 * - Any other time: the wait until league night starts, but never more than an
 *   hour. It cannot simply be `false`: TanStack Query only re-reads this
 *   function after a fetch, so a page opened at noon on Thursday would then
 *   never start polling when 4 PM arrives. Waiting exactly until the start
 *   (and at most an hour, in case the clock or a sleeping device drifts) makes
 *   the first poll land on the start, which then returns the one-minute value.
 *
 * TanStack Query already pauses an interval while the tab is in the background.
 */
export const liveRefetchInterval = (now: Date = new Date()): number => {
  if (isLeagueNightNow(now)) return LIVE_REFETCH_MS;
  const untilStart = nextLeagueNightStart(now).getTime() - now.getTime();
  return Math.min(Math.max(untilStart, LIVE_REFETCH_MS), MAX_IDLE_CHECK_MS);
};

import { getLeagueCalendarDate, getLeagueMidnightUtc } from '@/utils/timezone';

/**
 * Week arithmetic for the weekly recap.
 *
 * A week number is never stored on a match — it is derived from the match date
 * against the season start. `power_score_snapshots.week_number` is the only
 * persisted week in the app, and it is produced by the same `FLOOR(days / 7) + 1`
 * rule (see the `get_season_week_number` SQL function), so the two agree.
 *
 * Everything here is pure so it can be tested directly. It used to live inside
 * `WeeklyRecapService.fetchWeeklyRecap`, wrapped in a catch-everything block
 * that made it unreachable from a test.
 */

/** Parse `seasons.start_date`, tolerating an ISO timestamp form. */
export const parseSeasonStart = (
  seasonStartDate: string
): { year: number; month: number; day: number } => {
  const [year, month, day] = seasonStartDate.slice(0, 10).split('-').map(Number);
  return { year, month, day };
};

/**
 * Which season week a match date falls in, counting from 1.
 *
 * Uses league-time (EST/EDT) calendar days on both sides. Evening matches are
 * stored as next-day UTC, so raw UTC arithmetic would push them into the
 * following week and drop earlier same-day matches.
 *
 * A date before the season start clamps to week 1 rather than going negative.
 */
export const deriveWeekNumber = (seasonStartDate: string, matchDate: Date): number => {
  const season = parseSeasonStart(seasonStartDate);
  const match = getLeagueCalendarDate(matchDate);

  const diffDays = Math.floor(
    (Date.UTC(match.year, match.month - 1, match.day) -
      Date.UTC(season.year, season.month - 1, season.day)) /
      (1000 * 60 * 60 * 24)
  );

  return Math.max(1, Math.floor(diffDays / 7) + 1);
};

/**
 * The half-open UTC window `[weekStart, weekEnd)` covering one season week.
 *
 * The bounds are UTC instants of league midnight, so a week spanning a daylight
 * saving change is still seven league days rather than 168 UTC hours.
 */
export const getWeekWindow = (
  seasonStartDate: string,
  weekNumber: number
): { weekStart: Date; weekEnd: Date } => {
  const { year, month, day } = parseSeasonStart(seasonStartDate);

  return {
    weekStart: getLeagueMidnightUtc(year, month, day + (weekNumber - 1) * 7),
    weekEnd: getLeagueMidnightUtc(year, month, day + weekNumber * 7),
  };
};

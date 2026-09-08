import { getLeagueCalendarDate } from '@/utils/timezone';

/** A match date is a full ISO UTC timestamp, so only `date` is needed here. */
type DatedMatch = { date?: string | null };

/** Sortable YYYYMMDD number for a league calendar day. */
const dayKey = ({ year, month, day }: { year: number; month: number; day: number }) =>
  year * 10000 + month * 100 + day;

/**
 * Pick the night the mass score entry tool should open on: the most recent
 * league night on or before today.
 *
 * Match dates are stored as UTC instants, and an 8 PM league game lands on the
 * *next* UTC day, so the comparison is done on the league calendar date rather
 * than the raw instant. Otherwise the tool opens on last week whenever the
 * browser runs in UTC.
 *
 * When every match is still in the future (a season that has not started), the
 * earliest future night is used instead, so the tool never opens on a date with
 * nothing to enter.
 *
 * Returns a local-midnight Date, which is the shape the date filter and
 * `createEveningAwareDateRange` both expect. Returns null when no match has a
 * usable date. See UX audit A-03.
 */
export const pickDefaultEntryDate = (
  matches: DatedMatch[],
  now: Date = new Date()
): Date | null => {
  const todayKey = dayKey(getLeagueCalendarDate(now));

  let latestPast: { key: number; year: number; month: number; day: number } | null = null;
  let earliestFuture: { key: number; year: number; month: number; day: number } | null = null;

  for (const match of matches) {
    if (!match.date) continue;
    const parsed = new Date(match.date);
    if (Number.isNaN(parsed.getTime())) continue;

    const calendar = getLeagueCalendarDate(parsed);
    const candidate = { key: dayKey(calendar), ...calendar };

    if (candidate.key <= todayKey) {
      if (!latestPast || candidate.key > latestPast.key) latestPast = candidate;
    } else if (!earliestFuture || candidate.key < earliestFuture.key) {
      earliestFuture = candidate;
    }
  }

  const chosen = latestPast ?? earliestFuture;
  return chosen ? new Date(chosen.year, chosen.month - 1, chosen.day) : null;
};

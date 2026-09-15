import { getLeagueCalendarDate } from '@/utils/timezone';

/** Only the date matters here; the rest of a signup row is the caller's. */
type DatedSignup = { event_date?: string | null };

/** The value the night picker carries when the admin wants every night at once. */
export const ALL_NIGHTS = '__all__';

/**
 * Which nights a list of signups covers, most recent first.
 *
 * `event_date` is a Postgres `date`, so it arrives as a plain `YYYY-MM-DD`
 * string with no instant and no zone attached. That is already the key — none
 * of the UTC-to-league-time work `leagueNightKey` does for match timestamps
 * applies, and ISO dates sort correctly as plain strings.
 */
export const signupNights = (signups: DatedSignup[]): string[] => {
  const nights = new Set<string>();
  for (const signup of signups) {
    if (signup.event_date) nights.add(signup.event_date);
  }
  return Array.from(nights).sort((a, b) => b.localeCompare(a));
};

/** Today in league time, as a `YYYY-MM-DD` key comparable with `event_date`. */
export const leagueToday = (now: Date = new Date()): string => {
  const { year, month, day } = getLeagueCalendarDate(now);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * The night the signups tab should open on: **the next event, or the most
 * recent one when every night has passed.**
 *
 * This is the other way round from mass score entry, which opens on the most
 * recent night on or before today. Scores are entered after a night is played;
 * signups are collected before one, and the list an admin wants on Thursday
 * afternoon is Thursday's.
 *
 * Takes the nights `signupNights` returned, so the default can never land on a
 * night with nobody on it. Returns null when there are no signups at all.
 */
export const pickDefaultSignupNight = (
  nights: string[],
  today: string = leagueToday()
): string | null => {
  if (nights.length === 0) return null;

  // `nights` is newest first, so the last one on or after today is the soonest.
  const upcoming = nights.filter((night) => night >= today);
  if (upcoming.length > 0) return upcoming[upcoming.length - 1];

  return nights[0];
};

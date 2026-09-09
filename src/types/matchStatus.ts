/**
 * Every state a league match can be in, as one union.
 *
 * `completed` and `scheduled` are read from the `iscompleted` column. The two
 * exceptional states are read from `Match['status']`, which an admin sets.
 *
 * Work the state out with `deriveMatchStatus()` in `@/utils/matchStatus` rather
 * than testing the raw columns — the UX audit (X-13) found nine different rules
 * for "is this match finished" across the app.
 */
export type MatchStatus = 'completed' | 'canceled' | 'postponed' | 'scheduled';

/**
 * The word shown on a match, one per state, in one place.
 *
 * The `Record` is keyed on the union, so adding a state to `MatchStatus` fails
 * the typecheck until it is given a word here.
 *
 * These name a single match. The Schedule's two tab labels name *lists* of
 * matches and are deliberately not driven from this map.
 */
export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  completed: 'Final',
  canceled: 'Canceled',
  postponed: 'Postponed',
  scheduled: 'Upcoming',
};

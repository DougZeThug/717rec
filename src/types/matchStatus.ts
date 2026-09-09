import type { Match } from '@/types';

/**
 * The exceptional states a match can be put into. A match with no `status` is
 * an ordinary one: scheduled, in progress, or finished — those are read from
 * `iscompleted` and the game wins, not from this field.
 *
 * One label per state, in one place. The UX audit (X-13) found the same match
 * described five different ways across the app; the `Record` keyed on the union
 * means adding a state to `Match['status']` fails the typecheck until it is
 * given a word here.
 */
export const MATCH_STATUS_LABELS: Record<NonNullable<Match['status']>, string> = {
  postponed: 'Postponed',
  canceled: 'Canceled',
};

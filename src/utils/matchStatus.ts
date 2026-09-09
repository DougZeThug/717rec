import type { MatchStatus } from '@/types/matchStatus';

/**
 * The two columns any match state is worked out from.
 *
 * Both are spelled the same on the camelCase `Match` and on the snake_case
 * database row, so one narrow shape serves every caller and nothing has to be
 * converted first.
 */
export interface MatchStatusInput {
  iscompleted?: boolean | null;
  status?: 'postponed' | 'canceled' | null;
}

/**
 * The one place the app decides what state a match is in.
 *
 * Order matters. A recorded result beats a plan, so `completed` is tested
 * first: an admin may postpone a match and then record its result, and the
 * result is what the league cares about. `canceled` beats `postponed` because
 * a called-off match is not merely late.
 *
 * `iscompleted` is `boolean | null`, and `null` means nobody ever recorded a
 * result — which is not finished. Testing `=== true` gives one answer for all
 * three values. The app used to read that column five different ways, and the
 * strict-equality one dropped `null` rows out of both Schedule tabs, so they
 * were visible to nobody.
 */
export const deriveMatchStatus = (match: MatchStatusInput): MatchStatus => {
  if (match.iscompleted === true) return 'completed';
  if (match.status === 'canceled') return 'canceled';
  if (match.status === 'postponed') return 'postponed';
  return 'scheduled';
};

/** True when the match is finished and its result stands. */
export const isMatchCompleted = (match: MatchStatusInput): boolean =>
  deriveMatchStatus(match) === 'completed';

/**
 * True when the match still needs a score: not finished, and not called off.
 *
 * This is the question every score queue and every "score this match" control
 * asks, so postponed and canceled matches fall out of all of them at once.
 */
export const isMatchOpenForScoring = (match: MatchStatusInput): boolean =>
  deriveMatchStatus(match) === 'scheduled';

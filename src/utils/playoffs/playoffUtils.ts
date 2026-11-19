import { PlayoffMatch } from '@/types/playoffTypes';

/**
 * Statuses that mean a match is being played, or is over. The bracket library
 * and the older playoff tables spell these differently, so both are listed.
 */
const PLAYED_STATUSES = new Set(['running', 'in_progress', 'completed', 'archived']);

/**
 * A match with an empty side: one slot is a BYE, or it still waits on an
 * earlier round. Nobody plays such a match.
 */
const hasEmptySide = (match: PlayoffMatch): boolean =>
  match.team1Id === null || match.team2Id === null;

/**
 * True once any match in a bracket has been played.
 *
 * Read the matches, not `bracket.state`. Nothing in the app ever writes an
 * in-progress state: a bracket goes straight from `pending` to `completed`
 * when the whole thing ends, so a bracket half way through a tournament still
 * reads as `pending`. Trusting `state` leaves a live bracket open to edits
 * that belong before it starts.
 *
 * A winner on its own is not proof of play. When the team count is not a power
 * of two, the bracket library pairs some teams against a BYE and records a win
 * for them as it draws the bracket, before anybody has played. Only a winner
 * between two real teams counts. A one-sided match an admin has walked forward
 * still counts, because it is marked played.
 */
export const hasPlayStarted = (matches: PlayoffMatch[] | undefined): boolean =>
  (matches ?? []).some(
    (match) =>
      PLAYED_STATUSES.has(match.status ?? '') ||
      (match.winnerId !== null && !hasEmptySide(match)) ||
      (match.team1Score ?? 0) > 0 ||
      (match.team2Score ?? 0) > 0 ||
      (match.team1GameWins ?? 0) > 0 ||
      (match.team2GameWins ?? 0) > 0
  );

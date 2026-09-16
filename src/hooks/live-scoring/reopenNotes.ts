import type { QueryClient } from '@tanstack/react-query';

/**
 * Notes left by whoever pressed Reopen, for the live connection to find.
 *
 * "Game N reopened" is raised by the live connection rather than by the reopen
 * itself, so that every screen watching the match is told once — including the
 * screen that did it, which is why the reopen raises no success message of its
 * own. The live connection tells a reopen from a game merely starting by asking
 * the cache whether that game *was* completed, and for every other scorer that
 * is right.
 *
 * It is not right for the scorer who pressed the button. Their screen refetches
 * the match the moment the write settles, and that refetch can land before the
 * live change comes back — so by the time the change arrives their cache
 * already reads "in progress", the check fails, and the one person who acted is
 * the only one not told. Whichever signal wins is a matter of timing, so the
 * notice they were promised was a coin flip.
 *
 * A note is taken before the write, while the old status is still known, and
 * survives the refetch. It is claimed exactly once, so a second change can
 * never turn it into a second notice.
 *
 * Kept against the query client rather than in a module-wide map so two clients
 * — a second tab, or one test after another — can never read each other's
 * notes. A WeakMap because the note must not keep a discarded client alive.
 * useGameFlow and useLiveMatchRealtime are siblings with no props path between
 * them; the query client is the only thing they share.
 */
const notesByClient = new WeakMap<QueryClient, Set<string>>();

const noteId = (matchId: string, gameId: string) => `${matchId}:${gameId}`;

/** Records that this screen reopened `gameId`, for the live change to claim. */
export const noteReopen = (client: QueryClient, matchId: string, gameId: string): void => {
  const notes = notesByClient.get(client) ?? new Set<string>();
  notes.add(noteId(matchId, gameId));
  notesByClient.set(client, notes);
};

/** Drops a note. A reopen that failed has nothing to announce. */
export const forgetReopen = (client: QueryClient, matchId: string, gameId: string): void => {
  notesByClient.get(client)?.delete(noteId(matchId, gameId));
};

/**
 * Takes the note for `gameId` if this screen left one, and returns whether it
 * did. Taking it removes it, so it can never be read a second time.
 */
export const claimReopen = (client: QueryClient, matchId: string, gameId: string): boolean =>
  notesByClient.get(client)?.delete(noteId(matchId, gameId)) ?? false;

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { useToast } from '@/hooks/useToast';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { errorLog, scoreLog } from '@/utils/logger';

interface CachedMatchSnapshot {
  matchId: string;
  bracketId: string;
  team1Score: number | null;
  team2Score: number | null;
  winnerId: string | null;
  status: string | number;
}

/** Match data in bracket cache (supports both legacy and brackets-manager formats) */
interface BracketMatch {
  id: string | number;
  // Legacy format fields
  team1Score?: number | null;
  team2Score?: number | null;
  team1_score?: number | null;
  team2_score?: number | null;
  winnerId?: string | null;
  winner_id?: string | null;
  status?: string | number;
  // Brackets-manager format fields
  opponent1_id?: string | null;
  opponent1_score?: number | null;
  opponent2_id?: string | null;
  opponent2_score?: number | null;
}

/** Cached bracket data structure */
interface BracketCacheData {
  matches?: BracketMatch[];
  [key: string]: unknown;
}

// Helper to match IDs that may have "match-" prefix
const matchIdMatches = (cachedId: string | number | undefined, targetId: string): boolean => {
  const cachedStr = cachedId?.toString() || '';
  const numericCached = cachedStr.replace('match-', '');
  const numericTarget = targetId.replace('match-', '');
  return numericCached === numericTarget || cachedStr === targetId;
};

export const useOptimisticScoreMutation = (bracketId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Keyed by match id, NOT single-slot: saves overlap. handleSaveMatchScore closes
  // the editor before awaiting the network call, so an admin can start saving a
  // second match while the first is still in flight. Sharing one snapshot let the
  // second save overwrite the first's, and let whichever save settled first wipe
  // the other's rollback state — leaving a failed save stuck at its optimistic score.
  const rollbackTimeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const snapshotsRef = useRef(new Map<string, CachedMatchSnapshot>());

  /**
   * How many saves for each match have not settled yet.
   *
   * Keying by match id was not enough on its own: the same match can be saved
   * twice over. The editor closes before the network call is awaited, so the
   * admin can reopen that match and save it again while the first save is still
   * out. Two things went wrong when they did.
   *
   * The second save re-read the cache to snapshot it — but the first save had
   * already written its optimistic score there, so the snapshot recorded a
   * number that was never persisted, and a rollback restored that instead of
   * the real one. And the first save to resolve deleted the snapshot outright,
   * which disarmed the second save's rollback, its timeout and the unmount
   * cleanup, while its failure still raised "Update Failed" — telling the admin
   * it had failed while the bracket kept showing the score it had not written.
   *
   * So: only the first save of a run snapshots, and only the last to settle
   * releases it.
   */
  const inFlightRef = useRef(new Map<string, number>());

  /**
   * What each in-flight save wrote, oldest first, per match.
   *
   * The baseline a rollback returns to is "the last value the league confirmed",
   * and that moves: once an earlier save of the same match comes back successful
   * its optimistic values ARE the confirmed ones, so a later save failing must
   * go back to those, not to what was on screen before either started. Without
   * this, a failure after a success put a superseded score back and leaned on
   * the invalidation to correct it — which it cannot do offline, or if the
   * refetch also fails.
   *
   * Consumed oldest-first: `onSuccess` carries only a match id, so which save
   * confirmed cannot be told apart. Saves for one match are issued in order, so
   * oldest-first is right whenever they also land in order, and the invalidation
   * in `rollback` is still there for when they do not.
   */
  const pendingWritesRef = useRef(new Map<string, CachedMatchSnapshot[]>());

  const retainInFlight = useCallback((matchId: string) => {
    const next = (inFlightRef.current.get(matchId) ?? 0) + 1;
    inFlightRef.current.set(matchId, next);
    return next;
  }, []);

  const releaseInFlight = useCallback((matchId: string) => {
    const next = (inFlightRef.current.get(matchId) ?? 1) - 1;
    if (next <= 0) inFlightRef.current.delete(matchId);
    else inFlightRef.current.set(matchId, next);
    return Math.max(0, next);
  }, []);

  /** This match as the cache currently holds it, or null when it holds no such match. */
  const readMatchSnapshot = useCallback(
    (matchId: string, forBracketId: string): CachedMatchSnapshot | null => {
      const currentData = queryClient.getQueryData<BracketCacheData>([
        'bracket-data',
        forBracketId,
      ]);
      const currentMatch = currentData?.matches?.find((m) => matchIdMatches(m.id, matchId));
      if (!currentMatch) return null;

      return {
        matchId,
        bracketId: forBracketId,
        team1Score: currentMatch.opponent1_score ?? currentMatch.team1Score ?? null,
        team2Score: currentMatch.opponent2_score ?? currentMatch.team2Score ?? null,
        winnerId: currentMatch.winner_id ?? currentMatch.winnerId ?? null,
        status: currentMatch.status ?? 'pending',
      };
    },
    [queryClient]
  );

  const clearRollbackTimeout = useCallback((matchId: string) => {
    const timeout = rollbackTimeoutsRef.current.get(matchId);
    if (timeout) {
      clearTimeout(timeout);
      rollbackTimeoutsRef.current.delete(matchId);
    }
  }, []);

  // Rollback to previous state (declared before applyOptimisticUpdate so the
  // setTimeout callback inside applyOptimisticUpdate can reference it).
  const rollback = useCallback(
    (matchId: string) => {
      // Above the early return on purpose: a match that was never in the cache
      // has no snapshot, and leaving its count standing would stop the next save
      // for it taking one.
      inFlightRef.current.delete(matchId);
      pendingWritesRef.current.delete(matchId);

      const snapshot = snapshotsRef.current.get(matchId);
      if (!snapshot) return;

      // A rolled-back save is settled: drop its pending timer so it cannot fire a
      // second, spurious "Update Timeout" toast 15s later.
      clearRollbackTimeout(matchId);
      scoreLog('Rolling back score update', snapshot);

      queryClient.setQueryData<BracketCacheData>(
        ['bracket-data', snapshot.bracketId],
        (oldData) => {
          if (!oldData?.matches) return oldData;

          return {
            ...oldData,
            matches: oldData.matches.map((match) => {
              const isMatch = matchIdMatches(match.id, snapshot.matchId);
              if (!isMatch) return match;

              if ('opponent1_score' in match || 'opponent1_id' in match) {
                return {
                  ...match,
                  opponent1_score: snapshot.team1Score,
                  opponent2_score: snapshot.team2Score,
                  status: snapshot.status,
                };
              } else {
                return {
                  ...match,
                  team1Score: snapshot.team1Score,
                  team2Score: snapshot.team2Score,
                  team1_score: snapshot.team1Score,
                  team2_score: snapshot.team2Score,
                  winnerId: snapshot.winnerId,
                  winner_id: snapshot.winnerId,
                  status: snapshot.status,
                };
              }
            }),
          };
        }
      );

      snapshotsRef.current.delete(matchId);

      // Force refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['bracket-data', snapshot.bracketId] });
    },
    [queryClient, clearRollbackTimeout]
  );

  // Lets the unmount cleanup below reach the current rollback without re-running
  // (and so re-arming) on every change to it.
  const rollbackRef = useRef(rollback);
  useEffect(() => {
    rollbackRef.current = rollback;
  }, [rollback]);

  /**
   * Undo anything still in flight when the page goes away.
   *
   * The rollback timer is the only thing that ever corrects a save that never
   * lands, and the query cache outlives this component: `useBracketData` keeps
   * bracket data for 5 minutes with `refetchOnMount: false`, so an optimistic
   * score left behind here is shown again on return without a refetch, and a
   * score that was never persisted looks saved.
   *
   * So don't just drop the timers — roll their matches back. That still silences
   * the "Update Timeout" toast for a screen that no longer exists (rollback itself
   * raises nothing), while leaving the cache holding only confirmed values. A save
   * that does land afterwards re-writes the true score via refetch and realtime.
   */
  useEffect(() => {
    // Captured into locals: reading ref.current inside the cleanup closure is
    // exactly what react-hooks/exhaustive-deps warns about.
    const timeouts = rollbackTimeoutsRef.current;
    const snapshots = snapshotsRef.current;
    const rollbackPending = rollbackRef;
    return () => {
      for (const timeout of timeouts.values()) clearTimeout(timeout);
      timeouts.clear();
      for (const matchId of [...snapshots.keys()]) rollbackPending.current(matchId);
    };
  }, []);

  // Apply optimistic update to bracket-data cache
  const applyOptimisticUpdate = useCallback(
    (
      matchId: string,
      team1Score: number,
      team2Score: number,
      team1GameWins: number,
      team2GameWins: number,
      team1Id: string | null,
      team2Id: string | null
    ) => {
      if (!bracketId) return;

      const winnerId = team1GameWins > team2GameWins ? team1Id : team2Id;

      scoreLog('Applying optimistic score update', {
        matchId,
        team1GameWins,
        team2GameWins,
        winnerId,
      });

      // Save snapshot for rollback, but only for the first save of a run: every
      // save after it reads a cache this hook has already written, so it would
      // record an optimistic score as the value to go back to.
      if (retainInFlight(matchId) === 1) {
        // Drop any stale entry first: if this match is not in the cache we must
        // end up with NO snapshot for it, never a leftover one that a later
        // rollback would restore onto the wrong match.
        snapshotsRef.current.delete(matchId);
        const before = readMatchSnapshot(matchId, bracketId);
        if (before) snapshotsRef.current.set(matchId, before);
      }

      // Update cache optimistically
      queryClient.setQueryData<BracketCacheData>(['bracket-data', bracketId], (oldData) => {
        if (!oldData?.matches) return oldData;

        return {
          ...oldData,
          matches: oldData.matches.map((match) => {
            const isMatch = matchIdMatches(match.id, matchId);
            if (!isMatch) return match;

            // Handle both brackets-manager format and legacy format
            if ('opponent1_score' in match || 'opponent1_id' in match) {
              // Brackets-manager format
              return {
                ...match,
                opponent1_score: team1GameWins,
                opponent2_score: team2GameWins,
                status: 4, // Completed in brackets-manager
              };
            } else {
              // Legacy format
              return {
                ...match,
                team1Score: team1Score,
                team2Score: team2Score,
                team1_score: team1Score,
                team2_score: team2Score,
                winnerId: winnerId,
                winner_id: winnerId,
                status: 'completed',
              };
            }
          }),
        };
      });

      // What this save put on screen. If it comes back successful while another
      // save for the same match is still out, this becomes the value that one
      // rolls back to — by then it is what the league holds.
      const written = readMatchSnapshot(matchId, bracketId);
      if (written) {
        const queue = pendingWritesRef.current.get(matchId);
        if (queue) queue.push(written);
        else pendingWritesRef.current.set(matchId, [written]);
      }

      // Set rollback timeout — replaces only THIS match's pending timer, so a second
      // save no longer leaves the first save with no timeout protection.
      clearRollbackTimeout(matchId);
      rollbackTimeoutsRef.current.set(
        matchId,
        setTimeout(() => {
          rollbackTimeoutsRef.current.delete(matchId);
          scoreLog('Score update timeout - rolling back');
          rollback(matchId);
          toast({
            title: 'Update Timeout',
            description: 'Score update took too long. Please try again.',
            variant: 'destructive',
          });
        }, 15000)
      ); // 15 second timeout
    },
    [
      bracketId,
      queryClient,
      toast,
      rollback,
      clearRollbackTimeout,
      retainInFlight,
      readMatchSnapshot,
    ]
  );

  // Clear timeout on success
  const onSuccess = useCallback(
    (matchId: string) => {
      const confirmed = pendingWritesRef.current.get(matchId)?.shift() ?? null;

      // Another save for this match is still out, and it is relying on both the
      // snapshot and the timer. Disarming them here is what used to strand a
      // later failure at its optimistic score. What does change is the value it
      // would roll back to: this save has landed, so what it wrote is now what
      // the league holds, and going back any further would undo a write that
      // succeeded.
      if (releaseInFlight(matchId) > 0) {
        if (confirmed) snapshotsRef.current.set(matchId, confirmed);
        return;
      }

      clearRollbackTimeout(matchId);
      snapshotsRef.current.delete(matchId);
      pendingWritesRef.current.delete(matchId);
      scoreLog('Optimistic score update confirmed', { matchId });
    },
    [clearRollbackTimeout, releaseInFlight]
  );

  // Handle error - rollback and notify
  const onError = useCallback(
    (error: Error, matchId: string) => {
      clearRollbackTimeout(matchId);
      errorLog('Score update failed, rolling back', error);
      // Ends the run for this match whatever else is still out: rollback puts
      // the cache back to the last confirmed score and invalidates, so a save
      // still in flight is corrected by its own refetch rather than by a
      // snapshot taken before it.
      rollback(matchId);
      toast({
        title: 'Update Failed',
        description: getUIErrorMessage(error, 'Score update failed'),
        variant: 'destructive',
      });
    },
    [rollback, toast, clearRollbackTimeout]
  );

  return {
    applyOptimisticUpdate,
    rollback,
    onSuccess,
    onError,
  };
};

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { useToast } from '@/hooks/useToast';
import { errorLog, scoreLog } from '@/utils/logger';

interface CachedMatchSnapshot {
  matchId: string;
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

  const clearRollbackTimeout = useCallback((matchId: string) => {
    const timeout = rollbackTimeoutsRef.current.get(matchId);
    if (timeout) {
      clearTimeout(timeout);
      rollbackTimeoutsRef.current.delete(matchId);
    }
  }, []);

  // Drop pending timers when the page goes away. Otherwise navigating off mid-save
  // leaves them to fire up to 15s later, writing to a cache and raising a
  // destructive toast for a screen that no longer exists.
  useEffect(() => {
    // Captured into a local: reading ref.current inside the cleanup closure is
    // exactly what react-hooks/exhaustive-deps warns about.
    const timeouts = rollbackTimeoutsRef.current;
    return () => {
      for (const timeout of timeouts.values()) clearTimeout(timeout);
      timeouts.clear();
    };
  }, []);

  // Rollback to previous state (declared before applyOptimisticUpdate so the
  // setTimeout callback inside applyOptimisticUpdate can reference it).
  const rollback = useCallback(
    (matchId: string) => {
      const snapshot = snapshotsRef.current.get(matchId);
      if (!bracketId || !snapshot) return;

      // A rolled-back save is settled: drop its pending timer so it cannot fire a
      // second, spurious "Update Timeout" toast 15s later.
      clearRollbackTimeout(matchId);
      scoreLog('Rolling back score update', snapshot);

      queryClient.setQueryData<BracketCacheData>(['bracket-data', bracketId], (oldData) => {
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
      });

      snapshotsRef.current.delete(matchId);

      // Force refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['bracket-data', bracketId] });
    },
    [bracketId, queryClient, clearRollbackTimeout]
  );

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

      // Save snapshot for rollback. Drop any stale entry first: if this match is not
      // in the cache we must end up with NO snapshot for it, never a leftover one
      // that a later rollback would restore onto the wrong match.
      snapshotsRef.current.delete(matchId);
      const currentData = queryClient.getQueryData<BracketCacheData>(['bracket-data', bracketId]);
      if (currentData?.matches) {
        const currentMatch = currentData.matches.find((m) => matchIdMatches(m.id, matchId));
        if (currentMatch) {
          snapshotsRef.current.set(matchId, {
            matchId,
            team1Score: currentMatch.opponent1_score ?? currentMatch.team1Score ?? null,
            team2Score: currentMatch.opponent2_score ?? currentMatch.team2Score ?? null,
            winnerId: currentMatch.winner_id ?? currentMatch.winnerId ?? null,
            status: currentMatch.status ?? 'pending',
          });
        }
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
    [bracketId, queryClient, toast, rollback, clearRollbackTimeout]
  );

  // Clear timeout on success
  const onSuccess = useCallback(
    (matchId: string) => {
      clearRollbackTimeout(matchId);
      snapshotsRef.current.delete(matchId);
      scoreLog('Optimistic score update confirmed', { matchId });
    },
    [clearRollbackTimeout]
  );

  // Handle error - rollback and notify
  const onError = useCallback(
    (error: Error, matchId: string) => {
      clearRollbackTimeout(matchId);
      errorLog('Score update failed, rolling back', error);
      rollback(matchId);
      toast({
        title: 'Update Failed',
        description: 'Score update failed. Please try again.',
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

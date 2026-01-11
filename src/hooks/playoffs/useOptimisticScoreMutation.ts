import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { useToast } from '@/hooks/use-toast';
import { errorLog, scoreLog } from '@/utils/logger';

interface CachedMatchSnapshot {
  matchId: string;
  team1Score: number | null;
  team2Score: number | null;
  winnerId: string | null;
  status: string;
}

// Helper to match IDs that may have "match-" prefix
const matchIdMatches = (cachedId: any, targetId: string): boolean => {
  const cachedStr = cachedId?.toString() || '';
  const numericCached = cachedStr.replace('match-', '');
  const numericTarget = targetId.replace('match-', '');
  return numericCached === numericTarget || cachedStr === targetId;
};

export const useOptimisticScoreMutation = (bracketId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const rollbackTimeoutRef = useRef<NodeJS.Timeout>();
  const snapshotRef = useRef<CachedMatchSnapshot | null>(null);

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

      // Save snapshot for rollback
      const currentData = queryClient.getQueryData(['bracket-data', bracketId]) as any;
      if (currentData?.matches) {
        const currentMatch = currentData.matches.find((m: any) => matchIdMatches(m.id, matchId));
        if (currentMatch) {
          snapshotRef.current = {
            matchId,
            team1Score: currentMatch.opponent1_score ?? currentMatch.team1Score ?? null,
            team2Score: currentMatch.opponent2_score ?? currentMatch.team2Score ?? null,
            winnerId: currentMatch.winner_id ?? currentMatch.winnerId ?? null,
            status: currentMatch.status ?? 'pending',
          };
        }
      }

      // Update cache optimistically
      queryClient.setQueryData(['bracket-data', bracketId], (oldData: any) => {
        if (!oldData?.matches) return oldData;

        return {
          ...oldData,
          matches: oldData.matches.map((match: any) => {
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

      // Set rollback timeout
      if (rollbackTimeoutRef.current) {
        clearTimeout(rollbackTimeoutRef.current);
      }
      rollbackTimeoutRef.current = setTimeout(() => {
        scoreLog('Score update timeout - rolling back');
        rollback();
        toast({
          title: 'Update Timeout',
          description: 'Score update took too long. Please try again.',
          variant: 'destructive',
        });
      }, 15000); // 15 second timeout
    },
    [bracketId, queryClient, toast]
  );

  // Rollback to previous state
  const rollback = useCallback(() => {
    if (!bracketId || !snapshotRef.current) return;

    const snapshot = snapshotRef.current;
    scoreLog('Rolling back score update', snapshot);

    queryClient.setQueryData(['bracket-data', bracketId], (oldData: any) => {
      if (!oldData?.matches) return oldData;

      return {
        ...oldData,
        matches: oldData.matches.map((match: any) => {
          const isMatch = matchIdMatches(match.id, snapshot.matchId);
          if (!isMatch) return match;

          if ('opponent1_score' in match || 'opponent1_id' in match) {
            return {
              ...match,
              opponent1_score: snapshot.team1Score,
              opponent2_score: snapshot.team2Score,
              status: snapshot.status === 'completed' ? 4 : 2,
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

    snapshotRef.current = null;

    // Force refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['bracket-data', bracketId] });
  }, [bracketId, queryClient]);

  // Clear timeout on success
  const onSuccess = useCallback(() => {
    if (rollbackTimeoutRef.current) {
      clearTimeout(rollbackTimeoutRef.current);
    }
    snapshotRef.current = null;
    scoreLog('Optimistic score update confirmed');
  }, []);

  // Handle error - rollback and notify
  const onError = useCallback(
    (error: Error) => {
      if (rollbackTimeoutRef.current) {
        clearTimeout(rollbackTimeoutRef.current);
      }
      errorLog('Score update failed, rolling back', error);
      rollback();
      toast({
        title: 'Update Failed',
        description: 'Score update failed. Please try again.',
        variant: 'destructive',
      });
    },
    [rollback, toast]
  );

  return {
    applyOptimisticUpdate,
    rollback,
    onSuccess,
    onError,
  };
};

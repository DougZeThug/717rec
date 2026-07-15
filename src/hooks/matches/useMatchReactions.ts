import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { MatchReaction, MatchReactionsService } from '@/services/matches/MatchReactionsService';
import { errorLog } from '@/utils/logger';

import { matchInteractionKeys } from './matchInteractionKeys';

export type { MatchReaction };
export interface ReactionCount {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

const EMPTY_MATCH_REACTIONS: MatchReaction[] = [];

const optimisticRemovalKey = (userId: string, emoji: string) => `${userId}:${emoji}`;

/** Build sorted reaction counts for display, marking whether the current user reacted. */
const countReactions = (reactions: MatchReaction[], userId?: string): ReactionCount[] => {
  const counts: ReactionCount[] = [];
  reactions.forEach((reaction) => {
    const existing = counts.find((item) => item.emoji === reaction.emoji);
    if (existing) {
      existing.count += 1;
      existing.users.push(reaction.user_id);
      if (reaction.user_id === userId) existing.hasReacted = true;
    } else
      counts.push({
        emoji: reaction.emoji,
        count: 1,
        users: [reaction.user_id],
        hasReacted: reaction.user_id === userId,
      });
  });
  return counts.sort((a, b) => b.count - a.count);
};

/** Subscribe to and mutate reaction state for a match through the query cache. */
export const useMatchReactions = (matchId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = user?.id;
  const queryKey = useMemo(() => matchInteractionKeys.reactions(matchId), [matchId]);
  const realtimeInsertsRef = useRef<Map<string, MatchReaction>>(new Map());
  const realtimeDeletesRef = useRef<Set<string>>(new Set());
  const pendingOptimisticRemovalsRef = useRef<Set<string>>(new Set());
  const reactionsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const fetched = await MatchReactionsService.fetchReactions(matchId);
      const byId = new Map(fetched.map((reaction) => [reaction.id, reaction]));
      realtimeInsertsRef.current.forEach((reaction, id) => {
        byId.set(id, reaction);
      });
      realtimeDeletesRef.current.forEach((id) => {
        byId.delete(id);
      });
      return Array.from(byId.values());
    },
    enabled: Boolean(matchId),
  });
  const reactions = reactionsQuery.data ?? EMPTY_MATCH_REACTIONS;
  const reactionCounts = useMemo(() => countReactions(reactions, user?.id), [reactions, user?.id]);

  useEffect(() => {
    if (reactionsQuery.error) errorLog('Error fetching match reactions:', reactionsQuery.error);
  }, [reactionsQuery.error]);
  useEffect(() => {
    if (!matchId) return;
    /** Resync match reactions after realtime reconnects. */
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey }).catch((err: unknown) => {
        errorLog('Error invalidating match reactions:', err);
      });
    };
    const { dispose } = subscribeWithRetry({
      label: `useMatchReactions(${matchId})`,
      build: () =>
        supabase
          .channel(`match-reactions-${matchId}-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'match_reactions',
              filter: `match_id=eq.${matchId}`,
            },
            (payload: { new: unknown; old: { id?: string } }) => {
              const newReaction = payload.new as MatchReaction;
              const pendingRemovalKey = optimisticRemovalKey(
                newReaction.user_id,
                newReaction.emoji
              );
              if (pendingOptimisticRemovalsRef.current.delete(pendingRemovalKey)) {
                realtimeInsertsRef.current.delete(newReaction.id);
                realtimeDeletesRef.current.add(newReaction.id);
                if (currentUserId === newReaction.user_id) {
                  MatchReactionsService.deleteReaction(newReaction.id, currentUserId).catch(
                    (err: unknown) => {
                      errorLog('Error removing delayed optimistic match reaction:', err);
                    }
                  );
                }
                queryClient.setQueryData<MatchReaction[]>(queryKey, (curr = []) =>
                  curr.filter((reaction) => reaction.id !== newReaction.id)
                );
                return;
              }
              realtimeDeletesRef.current.delete(newReaction.id);
              realtimeInsertsRef.current.set(newReaction.id, newReaction);
              queryClient.setQueryData<MatchReaction[]>(queryKey, (curr = []) => {
                if (curr.some((r) => r.id === newReaction.id)) return curr;
                const withoutOptimisticDuplicate = curr.filter(
                  (reaction) =>
                    !(
                      reaction.id.startsWith('optimistic-') &&
                      reaction.user_id === newReaction.user_id &&
                      reaction.emoji === newReaction.emoji
                    )
                );
                return [...withoutOptimisticDuplicate, newReaction];
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'match_reactions',
              filter: `match_id=eq.${matchId}`,
            },
            (payload: { new: unknown; old: { id?: string } }) => {
              const deletedReaction = payload.old as MatchReaction;
              realtimeInsertsRef.current.delete(deletedReaction.id);
              realtimeDeletesRef.current.add(deletedReaction.id);
              queryClient.setQueryData<MatchReaction[]>(queryKey, (curr = []) =>
                curr.filter((r) => r.id !== deletedReaction.id)
              );
            }
          ),
      onReconnect: (isFirst) => {
        if (!isFirst) invalidate();
      },
    });
    return () => dispose();
  }, [currentUserId, matchId, queryClient, queryKey]);

  const mutation = useMutation({
    mutationFn: async (emoji: string) => {
      if (!currentUserId) throw new Error('User is required to toggle a reaction');
      const existing = reactions.find((r) => r.user_id === currentUserId && r.emoji === emoji);
      if (existing) await MatchReactionsService.deleteReaction(existing.id, currentUserId);
      else await MatchReactionsService.insertReaction(matchId, currentUserId, emoji);
    },
    onMutate: async (emoji) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MatchReaction[]>(queryKey);
      queryClient.setQueryData<MatchReaction[]>(queryKey, (curr = []) => {
        if (!currentUserId) return curr;
        const existing = curr.find((r) => r.user_id === currentUserId && r.emoji === emoji);
        if (existing) return curr.filter((r) => r.id !== existing.id);
        return [
          ...curr,
          {
            id: `optimistic-${currentUserId}-${emoji}`,
            match_id: matchId,
            user_id: currentUserId,
            emoji,
            created_at: new Date().toISOString(),
          },
        ];
      });
      return { previous };
    },
    onError: (err, _emoji, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      errorLog('Error toggling reaction:', err);
      toast({ title: 'Error', description: 'Failed to update reaction', variant: 'destructive' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey, refetchType: 'none' }),
  });
  /** Toggle the current user's reaction for this match. */
  const toggleReaction = async (emoji: string) => {
    if (!user) {
      toast({
        title: 'Not signed in',
        description: 'You must be signed in to react to matches',
        variant: 'destructive',
      });
      return;
    }
    if (!emoji) return;
    const existingOptimisticReaction = reactions.find(
      (reaction) =>
        reaction.id.startsWith('optimistic-') &&
        reaction.user_id === user.id &&
        reaction.emoji === emoji
    );
    if (existingOptimisticReaction) {
      pendingOptimisticRemovalsRef.current.add(optimisticRemovalKey(user.id, emoji));
      queryClient.setQueryData<MatchReaction[]>(queryKey, (curr = []) =>
        curr.filter((reaction) => reaction.id !== existingOptimisticReaction.id)
      );
      return;
    }
    await mutation.mutateAsync(emoji).catch(() => undefined);
  };
  return { reactions, reactionCounts, isLoading: reactionsQuery.isLoading, toggleReaction };
};

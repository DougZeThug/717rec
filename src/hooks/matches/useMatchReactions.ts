import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import type { MatchReaction as ServiceMatchReaction } from '@/services/matches/MatchReactionsService';
import { MatchReactionsService } from '@/services/matches/MatchReactionsService';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { errorLog } from '@/utils/logger';

import { matchInteractionKeys } from './matchInteractionKeys';

export type MatchReaction = ServiceMatchReaction;

interface ReactionCount {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

const EMPTY_MATCH_REACTIONS: MatchReaction[] = [];

/** Build a stable key for canceling an optimistic reaction by user and emoji. */
const optimisticRemovalKey = (reactionMatchId: string, userId: string, emoji: string) =>
  `${reactionMatchId}:${userId}:${emoji}`;

/** The stand-in row shown while an insert is still on its way. */
const makeOptimisticReaction = (
  reactionMatchId: string,
  userId: string,
  emoji: string
): MatchReaction => ({
  id: `optimistic-${userId}-${emoji}`,
  match_id: reactionMatchId,
  user_id: userId,
  emoji,
  created_at: new Date().toISOString(),
});

/** Build sorted reaction counts for display, marking whether the current user reacted. */
const countReactions = (reactions: MatchReaction[], userId?: string): ReactionCount[] => {
  const counts: ReactionCount[] = [];
  reactions.forEach((reaction) => {
    const existing = counts.find((item) => item.emoji === reaction.emoji);
    if (existing) {
      existing.count += 1;
      existing.users.push(reaction.user_id);
      if (reaction.user_id === userId) existing.hasReacted = true;
    } else {
      counts.push({
        emoji: reaction.emoji,
        count: 1,
        users: [reaction.user_id],
        hasReacted: reaction.user_id === userId,
      });
    }
  });
  return counts.sort((a, b) => b.count - a.count);
};

/** Ignore queued mutation promise errors already handled by mutation callbacks. */
function ignoreQueuedMutationError() {
  // Errors are surfaced by the mutation onError callback.
}

/** Subscribe to and mutate reaction state for a match through the query cache. */
export const useMatchReactions = (matchId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = user?.id;
  const queryKey = useMemo(() => matchInteractionKeys.reactions(matchId), [matchId]);
  const realtimeInsertsRef = useRef<Map<string, MatchReaction>>(new Map());
  const realtimeDeletesRef = useRef<Set<string>>(new Set());
  const pendingOptimisticRemovalsRef = useRef<Set<string>>(new Set());
  const mutationChainsRef = useRef<Map<string, Promise<void>>>(new Map());
  // What onMutate decided, keyed by emoji. mutationFn runs straight after
  // onMutate and must act on that decision: the `reactions` array it closes over
  // is from the last render, which can still hold a row the cache has let go of.
  const toggleTargetsRef = useRef<Map<string, MatchReaction | null>>(new Map());

  useEffect(() => {
    realtimeInsertsRef.current.clear();
    realtimeDeletesRef.current.clear();
    // This one was missed before: it is keyed by match, but a hook instance
    // returning to a match it had already toggled carried a live cancellation
    // straight into the next tap.
    pendingOptimisticRemovalsRef.current.clear();
    toggleTargetsRef.current.clear();
  }, [matchId]);

  const reactionsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      // Copy the tombstones, then empty both buffers before the fetch starts.
      // A removal that is still on its way must not come back in this result,
      // and nothing may outlive this fetch: the buffers used to be cleared only
      // when matchId changed, so one stale realtime row was re-applied on every
      // later refetch -- including a reconnect refetch that read an empty
      // table -- and a reaction the reader had turned off kept coming back.
      // Events that land while the fetch is in flight refill the buffers and
      // are merged below, so realtime still wins over a snapshot it postdates.
      const pendingDeleteIds = new Set(realtimeDeletesRef.current);
      realtimeInsertsRef.current.clear();
      realtimeDeletesRef.current.clear();
      const fetched = await MatchReactionsService.fetchReactions(matchId);
      const byId = new Map(fetched.map((reaction) => [reaction.id, reaction]));
      pendingDeleteIds.forEach((id) => {
        byId.delete(id);
      });
      realtimeInsertsRef.current.forEach((reaction, id) => {
        byId.set(id, reaction);
      });
      realtimeDeletesRef.current.forEach((id) => {
        byId.delete(id);
      });
      return Array.from(byId.values());
    },
    enabled: Boolean(matchId),
    refetchOnMount: 'always',
  });
  const reactions = reactionsQuery.data ?? EMPTY_MATCH_REACTIONS;
  const reactionCounts = useMemo(() => countReactions(reactions, user?.id), [reactions, user?.id]);

  useEffect(() => {
    if (reactionsQuery.error) errorLog('Error fetching match reactions:', reactionsQuery.error);
  }, [reactionsQuery.error]);
  useEffect(
    function setupMatchReactionSubscription(): (() => void) | undefined {
      if (!matchId) return undefined;
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
                  newReaction.match_id,
                  newReaction.user_id,
                  newReaction.emoji
                );
                if (pendingOptimisticRemovalsRef.current.delete(pendingRemovalKey)) {
                  realtimeInsertsRef.current.delete(newReaction.id);
                  realtimeDeletesRef.current.add(newReaction.id);
                  if (currentUserId === newReaction.user_id) {
                    MatchReactionsService.deleteReaction(newReaction.id, currentUserId).catch(
                      (err: unknown) => {
                        realtimeDeletesRef.current.delete(newReaction.id);
                        realtimeInsertsRef.current.set(newReaction.id, newReaction);
                        queryClient.setQueryData<MatchReaction[]>(queryKey, (curr = []) =>
                          curr.some((reaction) => reaction.id === newReaction.id)
                            ? curr
                            : [...curr, newReaction]
                        );
                        queryClient
                          .invalidateQueries({ queryKey })
                          .catch((invalidateError: unknown) => {
                            errorLog(
                              'Error invalidating match reactions after failed cleanup:',
                              invalidateError
                            );
                          });
                        errorLog('Error removing delayed optimistic match reaction:', err);
                      }
                    );
                  }
                  queryClient.setQueryData<MatchReaction[]>(queryKey, (curr = []) =>
                    curr.filter((reaction) => reaction.id !== newReaction.id)
                  );
                  return;
                }
                // The mutation raced ahead of this event and already marked the
                // row for deletion. Putting it back would show the reader a
                // reaction they have turned off. Wait for the DELETE event.
                if (realtimeDeletesRef.current.has(newReaction.id)) {
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
                // Supabase sends only the replica-identity columns, so `id` can
                // be missing. Adding undefined to the buffers poisons them.
                if (deletedReaction.id) {
                  realtimeInsertsRef.current.delete(deletedReaction.id);
                  realtimeDeletesRef.current.add(deletedReaction.id);
                }
                queryClient.setQueryData<MatchReaction[]>(queryKey, (curr = []) =>
                  curr.filter((r) => r.id !== deletedReaction.id)
                );
              }
            ),
        onReconnect: (isFirst) => {
          if (!isFirst) invalidate();
        },
      });
      return () => {
        dispose();
      };
    },
    [currentUserId, matchId, queryClient, queryKey]
  );

  const mutation = useMutation({
    mutationFn: async (emoji: string) => {
      if (!currentUserId) throw new Error('User is required to toggle a reaction');
      // The direction onMutate settled on, from the live cache, rather than the
      // `reactions` array captured at the last render. The two could disagree --
      // a realtime row landing between the render and the tap was enough -- and
      // then this sent a delete for a row onMutate had just added optimistically.
      const existing = toggleTargetsRef.current.get(emoji) ?? null;
      // An optimistic id names no row the server has, so it can never be
      // deleted. toggleReaction catches that case before queueing; if one ever
      // slipped through, an insert for this emoji is already on its way.
      if (existing?.id.startsWith('optimistic-')) return;
      if (existing) {
        await MatchReactionsService.deleteReaction(existing.id, currentUserId);
        return;
      }
      await MatchReactionsService.insertReaction(matchId, currentUserId, emoji);
      const removalKey = optimisticRemovalKey(matchId, currentUserId, emoji);
      if (pendingOptimisticRemovalsRef.current.delete(removalKey)) {
        let tombstonedId: string | null = null;
        try {
          const savedReaction = (await MatchReactionsService.fetchReactions(matchId)).find(
            (reaction) => reaction.user_id === currentUserId && reaction.emoji === emoji
          );
          if (savedReaction) {
            realtimeInsertsRef.current.delete(savedReaction.id);
            realtimeDeletesRef.current.add(savedReaction.id);
            tombstonedId = savedReaction.id;
            await MatchReactionsService.deleteReaction(savedReaction.id, currentUserId);
          }
        } catch (err) {
          // The clean-up failed, so the row is still in the table. A tombstone
          // left behind would make the next refetch hide it, and the reader
          // would see no reaction while everyone else sees theirs. Drop the
          // tombstone and let onSettled's refetch show the truth.
          //
          // Do not rethrow: the insert succeeded, so onError's rollback and its
          // "failed to update" would be the wrong story. The removal is what
          // failed, and the toast below says so.
          if (tombstonedId) realtimeDeletesRef.current.delete(tombstonedId);
          errorLog('Error removing delayed optimistic match reaction:', err);
          toast({
            title: 'Error',
            description: getUIErrorMessage(err, 'Failed to remove reaction'),
            variant: 'destructive',
          });
        }
      }
    },
    onMutate: async (emoji) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MatchReaction[]>(queryKey);
      // Decide here, from the live cache, and record it unconditionally --
      // including "nothing to remove" -- so mutationFn acts on this decision and
      // never re-derives its own from a stale render.
      const existing = currentUserId
        ? ((previous ?? []).find((r) => r.user_id === currentUserId && r.emoji === emoji) ?? null)
        : null;
      toggleTargetsRef.current.set(emoji, existing);
      queryClient.setQueryData<MatchReaction[]>(queryKey, (curr = []) => {
        if (!currentUserId) return curr;
        if (existing) return curr.filter((r) => r.id !== existing.id);
        return [...curr, makeOptimisticReaction(matchId, currentUserId, emoji)];
      });
      return { previous };
    },
    onError: (err, emoji, context) => {
      // The insert never landed, so nothing is on its way any more. A pending
      // cancellation left behind here would make the next tap restore a row the
      // server has never heard of, and swallow the tap that asked for it.
      if (currentUserId) {
        pendingOptimisticRemovalsRef.current.delete(
          optimisticRemovalKey(matchId, currentUserId, emoji)
        );
      }
      if (context) queryClient.setQueryData(queryKey, context.previous ?? []);
      queryClient
        .invalidateQueries({ queryKey, refetchType: 'active' })
        .catch((invalidateError) => {
          errorLog('Error invalidating match reactions after failed toggle:', invalidateError);
        });
      errorLog('Error toggling reaction:', err);
      toast({
        title: 'Error',
        description: getUIErrorMessage(err, 'Failed to update reaction'),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey, refetchType: 'active' }).catch((err: unknown) => {
        errorLog('Error invalidating match reactions after settlement:', err);
      });
    },
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
    const removalKey = optimisticRemovalKey(matchId, user.id, emoji);

    // Asking back for a reaction whose cancellation is still pending: the first
    // tap's insert is already on its way, so put the row back and stop here.
    // Queueing a second mutation instead let it decide its own direction later,
    // by which time the realtime row for the first tap had landed -- so it read
    // "it's on" and deleted the very row the reader had just asked to keep.
    if (pendingOptimisticRemovalsRef.current.delete(removalKey)) {
      queryClient.setQueryData<MatchReaction[]>(queryKey, (curr = []) =>
        curr.some((reaction) => reaction.user_id === user.id && reaction.emoji === emoji)
          ? curr
          : [...curr, makeOptimisticReaction(matchId, user.id, emoji)]
      );
      return;
    }

    // Read the cache rather than the render closure: taps land faster than
    // React re-renders for the one before them.
    const current = queryClient.getQueryData<MatchReaction[]>(queryKey) ?? EMPTY_MATCH_REACTIONS;
    const existingOptimisticReaction = current.find(
      (reaction) =>
        reaction.id.startsWith('optimistic-') &&
        reaction.user_id === user.id &&
        reaction.emoji === emoji
    );
    if (existingOptimisticReaction) {
      pendingOptimisticRemovalsRef.current.add(removalKey);
      queryClient.setQueryData<MatchReaction[]>(queryKey, (curr = []) =>
        curr.filter((reaction) => reaction.id !== existingOptimisticReaction.id)
      );
      return;
    }
    const previousMutation = mutationChainsRef.current.get(emoji) ?? Promise.resolve();
    const nextMutation = previousMutation
      .catch(ignoreQueuedMutationError)
      .then(async () => {
        await mutation.mutateAsync(emoji);
      })
      .catch(ignoreQueuedMutationError);
    mutationChainsRef.current.set(emoji, nextMutation);
    await nextMutation;
    if (mutationChainsRef.current.get(emoji) === nextMutation) {
      mutationChainsRef.current.delete(emoji);
    }
  };
  return { reactions, reactionCounts, isLoading: reactionsQuery.isLoading, toggleReaction };
};

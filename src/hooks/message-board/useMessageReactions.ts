import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { MessageReactionsService } from '@/services/messages/MessageReactionsService';
import { MessageReaction, ReactionCount } from '@/types/reactions';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { errorLog } from '@/utils/logger';

import { messageBoardKeys } from './messageBoardKeys';

const EMPTY_MESSAGE_REACTIONS: MessageReaction[] = [];

/** Build a stable key for canceling an optimistic reaction by user and emoji. */
const optimisticRemovalKey = (userId: string, emoji: string) => `${userId}:${emoji}`;

/** Build sorted message reaction counts and current-user reaction flags. */
const countReactions = (reactions: MessageReaction[], userId?: string): ReactionCount[] => {
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

/** Ignore queued mutation promise errors already handled by mutation callbacks. */
function ignoreQueuedMessageMutationError() {
  // Errors are surfaced by the mutation onError callback.
}

/** Subscribe to and mutate reaction state for a message through the query cache. */
export const useMessageReactions = (messageId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = user?.id;
  const queryKey = useMemo(() => messageBoardKeys.reactions(messageId), [messageId]);
  const pendingOptimisticRemovalsRef = useRef<Set<string>>(new Set());
  const realtimeInsertsRef = useRef<Map<string, MessageReaction>>(new Map());
  const realtimeDeletesRef = useRef<Set<string>>(new Set());
  // Rows whose delete has been issued and has not settled. realtimeDeletesRef
  // holds rows the server has already removed, so it only has to bridge the one
  // fetch that was in flight. These are different: until the delete commits the
  // server still reports the row, so a second refetch landing in that window
  // would put back a reaction the reader had turned off. Cleared when the
  // delete settles, not per fetch.
  const inFlightDeletesRef = useRef<Set<string>>(new Set());
  const mutationChainsRef = useRef<Map<string, Promise<void>>>(new Map());

  useEffect(() => {
    pendingOptimisticRemovalsRef.current.clear();
    realtimeInsertsRef.current.clear();
    realtimeDeletesRef.current.clear();
    inFlightDeletesRef.current.clear();
  }, [messageId]);

  const reactionsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      // Snapshot pending deletions BEFORE clearing so async removals in flight
      // (e.g. fire-and-forget removeReaction from the INSERT handler when the
      // user toggled off an optimistic reaction) cannot be resurrected by this
      // refetch. Any INSERT/DELETE events that arrive DURING the in-flight
      // fetch will re-populate the refs and still be merged in below.
      const pendingDeleteIds = new Set(realtimeDeletesRef.current);
      realtimeInsertsRef.current.clear();
      realtimeDeletesRef.current.clear();
      const fetched = await MessageReactionsService.fetchReactions(messageId);
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
      inFlightDeletesRef.current.forEach((id) => {
        byId.delete(id);
      });
      return Array.from(byId.values());
    },
    enabled: Boolean(messageId),
    refetchOnMount: 'always',
  });
  const reactions = reactionsQuery.data ?? EMPTY_MESSAGE_REACTIONS;
  const reactionCounts = useMemo(() => countReactions(reactions, user?.id), [reactions, user?.id]);
  useEffect(() => {
    if (reactionsQuery.error) errorLog('Error fetching reactions:', reactionsQuery.error);
  }, [reactionsQuery.error]);
  useEffect(
    function setupMessageReactionSubscription(): (() => void) | undefined {
      if (!messageId) return undefined;
      /** Resync message reactions after realtime reconnects. */
      const invalidate = () => {
        queryClient.invalidateQueries({ queryKey }).catch((err: unknown) => {
          errorLog('Error invalidating message reactions:', err);
        });
      };
      const { dispose } = subscribeWithRetry({
        label: `useMessageReactions(${messageId})`,
        build: () =>
          supabase
            .channel(`message-reactions-${messageId}-${Date.now()}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'message_reactions',
                filter: `message_id=eq.${messageId}`,
              },
              (payload: { new: unknown; old: { id?: string } }) => {
                const newReaction = payload.new as MessageReaction;
                const pendingRemovalKey = optimisticRemovalKey(
                  newReaction.user_id,
                  newReaction.emoji
                );
                if (pendingOptimisticRemovalsRef.current.delete(pendingRemovalKey)) {
                  realtimeInsertsRef.current.delete(newReaction.id);
                  realtimeDeletesRef.current.add(newReaction.id);
                  if (currentUserId === newReaction.user_id) {
                    inFlightDeletesRef.current.add(newReaction.id);
                    // Queue this clean-up with the taps for the same emoji. Sent
                    // straight out, it raced a later "tap on again": that tap's
                    // upsert is queued, this delete was not, so both could be in
                    // flight together. When the upsert reached Postgres first it
                    // matched the row still sitting there, and this delete then
                    // removed it -- losing the reader's last tap with no error.
                    //
                    // Do not await: this is a realtime callback. Build the link,
                    // store it, and let the cache update below run now.
                    const previousMutation =
                      mutationChainsRef.current.get(newReaction.emoji) ?? Promise.resolve();
                    const nextMutation = previousMutation
                      // A predecessor's failure is not this clean-up's failure;
                      // without this the compensation below would run for it.
                      .catch(ignoreQueuedMessageMutationError)
                      .then(() =>
                        MessageReactionsService.removeReaction(newReaction.id, currentUserId)
                      )
                      .catch((err: unknown) => {
                        realtimeDeletesRef.current.delete(newReaction.id);
                        realtimeInsertsRef.current.set(newReaction.id, newReaction);
                        queryClient.setQueryData<MessageReaction[]>(queryKey, (curr = []) =>
                          curr.some((reaction) => reaction.id === newReaction.id)
                            ? curr
                            : [...curr, newReaction]
                        );
                        queryClient
                          .invalidateQueries({ queryKey })
                          .catch((invalidateError: unknown) => {
                            errorLog(
                              'Error invalidating message reactions after failed cleanup:',
                              invalidateError
                            );
                          });
                        errorLog('Error removing delayed optimistic message reaction:', err);
                      })
                      .finally(() => {
                        inFlightDeletesRef.current.delete(newReaction.id);
                      })
                      // Nothing awaits a stored link until the next tap on this
                      // emoji, which may never come, so a throw in the
                      // compensation above would surface as an unhandled
                      // rejection. Keep the stored promise one that settles.
                      .catch(ignoreQueuedMessageMutationError);
                    mutationChainsRef.current.set(newReaction.emoji, nextMutation);
                  }
                  queryClient.setQueryData<MessageReaction[]>(queryKey, (curr = []) =>
                    curr.filter((reaction) => reaction.id !== newReaction.id)
                  );
                  return;
                }
                // If the mutationFn already marked this reaction for deletion
                // (raced ahead of the INSERT event), do not re-insert it into
                // the cache. Wait for the DELETE event to reconcile state.
                if (
                  realtimeDeletesRef.current.has(newReaction.id) ||
                  inFlightDeletesRef.current.has(newReaction.id)
                ) {
                  return;
                }
                realtimeDeletesRef.current.delete(newReaction.id);
                realtimeInsertsRef.current.set(newReaction.id, newReaction);
                queryClient.setQueryData<MessageReaction[]>(queryKey, (curr = []) => {
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
                table: 'message_reactions',
                filter: `message_id=eq.${messageId}`,
              },
              (payload: { new: unknown; old: { id?: string } }) => {
                const deletedReaction = payload.old as MessageReaction;
                if (deletedReaction.id) {
                  realtimeInsertsRef.current.delete(deletedReaction.id);
                  realtimeDeletesRef.current.add(deletedReaction.id);
                }
                queryClient.setQueryData<MessageReaction[]>(queryKey, (curr = []) =>
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
    [currentUserId, messageId, queryClient, queryKey]
  );
  const removeMutation = useMutation({
    mutationFn: (reactionId: string) =>
      currentUserId
        ? MessageReactionsService.removeReaction(reactionId, currentUserId)
        : Promise.reject(new Error('User is required to remove a reaction')),
    onMutate: async (reactionId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MessageReaction[]>(queryKey);
      queryClient.setQueryData<MessageReaction[]>(queryKey, (curr = []) =>
        curr.filter((reaction) => reaction.id !== reactionId)
      );
      return { previous };
    },
    onError: (err, _reactionId, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous ?? []);
      queryClient
        .invalidateQueries({ queryKey, refetchType: 'active' })
        .catch((invalidateError) => {
          errorLog('Error invalidating message reactions after failed removal:', invalidateError);
        });
      errorLog('Error removing reaction:', err);
      toast({
        title: 'Error',
        description: getUIErrorMessage(err, 'Failed to remove reaction'),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey, refetchType: 'none' }).catch((err: unknown) => {
        errorLog('Error invalidating message reactions after removal:', err);
      });
    },
  });
  const addReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      if (!currentUserId) throw new Error('User is required to add a reaction');
      const insertedId = await MessageReactionsService.addReaction(messageId, currentUserId, emoji);
      const removalKey = optimisticRemovalKey(currentUserId, emoji);
      if (pendingOptimisticRemovalsRef.current.delete(removalKey)) {
        // Tombstone the inserted row BEFORE any further await so a realtime
        // INSERT arriving in the async gap cannot resurrect the reaction.
        let tombstonedId: string | null = null;
        try {
          if (insertedId) {
            realtimeInsertsRef.current.delete(insertedId);
            realtimeDeletesRef.current.add(insertedId);
            inFlightDeletesRef.current.add(insertedId);
            tombstonedId = insertedId;
          }
          const savedReaction = insertedId
            ? { id: insertedId }
            : (await MessageReactionsService.fetchReactions(messageId)).find(
                (reaction) => reaction.user_id === currentUserId && reaction.emoji === emoji
              );
          if (savedReaction) {
            realtimeInsertsRef.current.delete(savedReaction.id);
            realtimeDeletesRef.current.add(savedReaction.id);
            inFlightDeletesRef.current.add(savedReaction.id);
            tombstonedId = savedReaction.id;
            await MessageReactionsService.removeReaction(savedReaction.id, currentUserId);
          }
        } catch (err) {
          // The clean-up failed, so the row is still in the table. A tombstone
          // left behind would make the next refetch hide it, and the reader
          // would see no reaction while everyone else sees theirs. Drop the
          // tombstone and let onSettled's refetch show the truth.
          //
          // Do not rethrow: the add succeeded, so onError's "failed to add"
          // would be the wrong story. The removal is what failed, and the toast
          // below says so. The realtime INSERT handler compensates the same way
          // for the same failure.
          if (tombstonedId) realtimeDeletesRef.current.delete(tombstonedId);
          errorLog('Error removing delayed optimistic message reaction:', err);
          toast({
            title: 'Error',
            description: getUIErrorMessage(err, 'Failed to remove reaction'),
            variant: 'destructive',
          });
        } finally {
          // Settled either way: the row is gone, or the catch above has just
          // put it back. Holding it hidden past this point would hide a row
          // that is still in the table.
          if (tombstonedId) inFlightDeletesRef.current.delete(tombstonedId);
        }
      }
    },
    onMutate: async (emoji) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MessageReaction[]>(queryKey);
      if (!currentUserId) return { previous };
      queryClient.setQueryData<MessageReaction[]>(queryKey, (curr = []) => [
        ...curr,
        {
          id: `optimistic-${currentUserId}-${emoji}`,
          message_id: messageId,
          user_id: currentUserId,
          emoji,
          created_at: new Date().toISOString(),
        },
      ]);
      return { previous };
    },
    onError: (err, _emoji, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous ?? []);
      errorLog('Error adding reaction:', err);
      toast({
        title: 'Error',
        description: getUIErrorMessage(err, 'Failed to add reaction'),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey, refetchType: 'active' }).catch((err: unknown) => {
        errorLog('Error invalidating message reactions after add:', err);
      });
    },
  });
  /** Remove the current user's reaction from this message. */
  const removeReaction = async (reactionId: string) => {
    if (!user) return;
    // Read the cache, not the render closure. Taps land faster than React
    // re-renders for the one before them, and a row that arrived by realtime
    // may not be in `reactions` yet. Keyed by its id rather than its emoji, the
    // removal queues against nothing -- no add ever uses an id as a key -- so a
    // tap on the same emoji could run beside it. useMatchReactions reads the
    // cache in toggleReaction for the same reason.
    const current = queryClient.getQueryData<MessageReaction[]>(queryKey) ?? reactions;
    const reaction = current.find((item) => item.id === reactionId);
    // Still falls back to the id when the row is genuinely unknown. That is now
    // rare rather than routine.
    const mutationKey = reaction?.emoji ?? reactionId;
    const previousMutation = mutationChainsRef.current.get(mutationKey) ?? Promise.resolve();
    const nextMutation = previousMutation
      .catch(ignoreQueuedMessageMutationError)
      .then(async () => {
        await removeMutation.mutateAsync(reactionId);
      })
      .catch(ignoreQueuedMessageMutationError);
    mutationChainsRef.current.set(mutationKey, nextMutation);
    await nextMutation;
    if (mutationChainsRef.current.get(mutationKey) === nextMutation) {
      mutationChainsRef.current.delete(mutationKey);
    }
  };
  /** Toggle the current user's reaction for this message. */
  const addReaction = async (emoji: string) => {
    if (!user) {
      toast({
        title: 'Not signed in',
        description: 'You must be signed in to react to messages',
        variant: 'destructive',
      });
      return;
    }
    if (!emoji) return;
    pendingOptimisticRemovalsRef.current.delete(optimisticRemovalKey(user.id, emoji));
    const existingReaction = reactions.find((r) => r.user_id === user.id && r.emoji === emoji);
    if (existingReaction) {
      if (existingReaction.id.startsWith('optimistic-')) {
        pendingOptimisticRemovalsRef.current.add(optimisticRemovalKey(user.id, emoji));
        queryClient.setQueryData<MessageReaction[]>(queryKey, (curr = []) =>
          curr.filter((reaction) => reaction.id !== existingReaction.id)
        );
        return;
      }
      await removeReaction(existingReaction.id);
      return;
    }
    const previousMutation = mutationChainsRef.current.get(emoji) ?? Promise.resolve();
    const nextMutation = previousMutation
      .catch(ignoreQueuedMessageMutationError)
      .then(async () => {
        await addReactionMutation.mutateAsync(emoji);
      })
      .catch(ignoreQueuedMessageMutationError);
    mutationChainsRef.current.set(emoji, nextMutation);
    await nextMutation;
    if (mutationChainsRef.current.get(emoji) === nextMutation) {
      mutationChainsRef.current.delete(emoji);
    }
  };
  return {
    reactions,
    reactionCounts,
    isLoading: reactionsQuery.isLoading,
    addReaction,
    removeReaction,
  };
};

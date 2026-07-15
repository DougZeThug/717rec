import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { MessageReactionsService } from '@/services/messages/MessageReactionsService';
import { MessageReaction, ReactionCount } from '@/types/reactions';
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
  const mutationChainsRef = useRef<Map<string, Promise<void>>>(new Map());

  useEffect(() => {
    pendingOptimisticRemovalsRef.current.clear();
    realtimeInsertsRef.current.clear();
    realtimeDeletesRef.current.clear();
  }, [messageId]);

  const reactionsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const fetched = await MessageReactionsService.fetchReactions(messageId);
      const byId = new Map(fetched.map((reaction) => [reaction.id, reaction]));
      realtimeInsertsRef.current.forEach((reaction, id) => {
        byId.set(id, reaction);
      });
      realtimeDeletesRef.current.forEach((id) => {
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
                    MessageReactionsService.removeReaction(newReaction.id, currentUserId).catch(
                      (err: unknown) => {
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
                      }
                    );
                  }
                  queryClient.setQueryData<MessageReaction[]>(queryKey, (curr = []) =>
                    curr.filter((reaction) => reaction.id !== newReaction.id)
                  );
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
      toast({ title: 'Error', description: 'Failed to remove reaction', variant: 'destructive' });
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
      await MessageReactionsService.addReaction(messageId, currentUserId, emoji);
      const removalKey = optimisticRemovalKey(currentUserId, emoji);
      if (pendingOptimisticRemovalsRef.current.delete(removalKey)) {
        const savedReaction = (await MessageReactionsService.fetchReactions(messageId)).find(
          (reaction) => reaction.user_id === currentUserId && reaction.emoji === emoji
        );
        if (savedReaction) {
          realtimeInsertsRef.current.delete(savedReaction.id);
          realtimeDeletesRef.current.add(savedReaction.id);
          await MessageReactionsService.removeReaction(savedReaction.id, currentUserId);
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
      toast({ title: 'Error', description: 'Failed to add reaction', variant: 'destructive' });
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
    const reaction = reactions.find((item) => item.id === reactionId);
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

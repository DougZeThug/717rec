import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { MessageReactionsService } from '@/services/messages/MessageReactionsService';
import { MessageReaction, ReactionCount } from '@/types/reactions';
import { errorLog } from '@/utils/logger';

import { messageBoardKeys } from './messageBoardKeys';

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

export const useMessageReactions = (messageId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = messageBoardKeys.reactions(messageId);
  const reactionsQuery = useQuery({
    queryKey,
    queryFn: () => MessageReactionsService.fetchReactions(messageId),
    enabled: Boolean(messageId),
  });
  const reactions = reactionsQuery.data ?? [];
  const reactionCounts = useMemo(() => countReactions(reactions, user?.id), [reactions, user?.id]);
  useEffect(() => {
    if (reactionsQuery.error) errorLog('Error fetching reactions:', reactionsQuery.error);
  }, [reactionsQuery.error]);
  useEffect(() => {
    if (!messageId) return;
    const invalidate = () => void queryClient.invalidateQueries({ queryKey });
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
              queryClient.setQueryData<MessageReaction[]>(queryKey, (curr = []) =>
                curr.some((r) => r.id === newReaction.id) ? curr : [...curr, newReaction]
              );
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
              queryClient.setQueryData<MessageReaction[]>(queryKey, (curr = []) =>
                curr.filter((r) => r.id !== deletedReaction.id)
              );
            }
          ),
      onReconnect: (isFirst) => {
        if (!isFirst) invalidate();
      },
    });
    return () => dispose();
  }, [messageId, queryClient, queryKey]);
  const removeMutation = useMutation({
    mutationFn: (reactionId: string) =>
      MessageReactionsService.removeReaction(reactionId, user!.id),
    onMutate: async (reactionId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MessageReaction[]>(queryKey);
      queryClient.setQueryData<MessageReaction[]>(queryKey, (curr = []) =>
        curr.filter((reaction) => reaction.id !== reactionId)
      );
      return { previous };
    },
    onError: (err, _reactionId, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      errorLog('Error removing reaction:', err);
      toast({ title: 'Error', description: 'Failed to remove reaction', variant: 'destructive' });
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });
  const addReactionMutation = useMutation({
    mutationFn: (emoji: string) => MessageReactionsService.addReaction(messageId, user!.id, emoji),
    onMutate: async (emoji) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MessageReaction[]>(queryKey);
      queryClient.setQueryData<MessageReaction[]>(queryKey, (curr = []) => [
        ...curr,
        {
          id: `optimistic-${user!.id}-${emoji}`,
          message_id: messageId,
          user_id: user!.id,
          emoji,
          created_at: new Date().toISOString(),
        },
      ]);
      return { previous };
    },
    onError: (err, _emoji, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      errorLog('Error adding reaction:', err);
      toast({ title: 'Error', description: 'Failed to add reaction', variant: 'destructive' });
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });
  const removeReaction = async (reactionId: string) => {
    if (!user) return;
    await removeMutation.mutateAsync(reactionId).catch(() => undefined);
  };
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
    const existingReaction = reactions.find((r) => r.user_id === user.id && r.emoji === emoji);
    if (existingReaction) return removeReaction(existingReaction.id);
    await addReactionMutation.mutateAsync(emoji).catch(() => undefined);
  };
  return {
    reactions,
    reactionCounts,
    isLoading: reactionsQuery.isLoading,
    addReaction,
    removeReaction,
  };
};

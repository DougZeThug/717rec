import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

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

export const useMatchReactions = (matchId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = user?.id;
  const queryKey = matchInteractionKeys.reactions(matchId);
  const reactionsQuery = useQuery({
    queryKey,
    queryFn: () => MatchReactionsService.fetchReactions(matchId),
    enabled: Boolean(matchId),
  });
  const reactions = reactionsQuery.data ?? EMPTY_MATCH_REACTIONS;
  const reactionCounts = useMemo(() => countReactions(reactions, user?.id), [reactions, user?.id]);

  useEffect(() => {
    if (reactionsQuery.error) errorLog('Error fetching match reactions:', reactionsQuery.error);
  }, [reactionsQuery.error]);
  useEffect(() => {
    if (!matchId) return;
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
              queryClient.setQueryData<MatchReaction[]>(queryKey, (curr = []) =>
                curr.some((r) => r.id === newReaction.id) ? curr : [...curr, newReaction]
              );
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
  }, [matchId, queryClient, queryKey]);

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
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
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
    await mutation.mutateAsync(emoji).catch(() => undefined);
  };
  return { reactions, reactionCounts, isLoading: reactionsQuery.isLoading, toggleReaction };
};

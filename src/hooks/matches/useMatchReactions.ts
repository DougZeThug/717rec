import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { MatchReaction, MatchReactionsService } from '@/services/matches/MatchReactionsService';
import { errorLog } from '@/utils/logger';

export type { MatchReaction };

export interface ReactionCount {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

export const useMatchReactions = (matchId: string) => {
  const [reactions, setReactions] = useState<MatchReaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Group and count reactions
  const reactionCounts = useMemo(() => {
    const counts: ReactionCount[] = [];

    // Group by emoji
    reactions.forEach((reaction) => {
      const existing = counts.find((item) => item.emoji === reaction.emoji);

      if (existing) {
        existing.count += 1;
        existing.users.push(reaction.user_id);
        if (reaction.user_id === user?.id) {
          existing.hasReacted = true;
        }
      } else {
        counts.push({
          emoji: reaction.emoji,
          count: 1,
          users: [reaction.user_id],
          hasReacted: reaction.user_id === user?.id,
        });
      }
    });

    return counts.sort((a, b) => b.count - a.count);
  }, [reactions, user?.id]);

  const fetchReactions = useCallback(async () => {
    if (!matchId) return;
    try {
      setIsLoading(true);
      const data = await MatchReactionsService.fetchReactions(matchId);
      setReactions(data);
    } catch (err) {
      errorLog('Error fetching match reactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  // Fetch initial reactions
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void fetchReactions();
  }, [fetchReactions]);

  // Set up realtime subscription
  useEffect(() => {
    if (!matchId) return;

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
            (payload) => {
              const newReaction = payload.new as MatchReaction;
              setReactions((curr) => {
                if (curr.some((r) => r.id === newReaction.id)) return curr;
                return [...curr, newReaction];
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
            (payload) => {
              const deletedReaction = payload.old as MatchReaction;
              setReactions((curr) => curr.filter((r) => r.id !== deletedReaction.id));
            }
          ),
      onReconnect: (isFirst) => {
        if (!isFirst) void fetchReactions();
      },
    });
    return () => dispose();
  }, [matchId, fetchReactions]);

  // Toggle reaction (add or remove)
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

    try {
      // Check if the user already added this emoji reaction
      const existingReaction = reactions.find((r) => r.user_id === user.id && r.emoji === emoji);

      if (existingReaction) {
        // If the reaction exists, remove it (toggle behavior)
        await MatchReactionsService.deleteReaction(existingReaction.id, user.id);
      } else {
        // Add the new reaction
        await MatchReactionsService.insertReaction(matchId, user.id, emoji);
      }
    } catch (err) {
      errorLog('Error toggling reaction:', err);
      toast({
        title: 'Error',
        description: 'Failed to update reaction',
        variant: 'destructive',
      });
    }
  };

  return {
    reactions,
    reactionCounts,
    isLoading,
    toggleReaction,
  };
};

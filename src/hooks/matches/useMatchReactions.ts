import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { errorLog } from '@/utils/logger';

export interface MatchReaction {
  id: string;
  match_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

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

  // Fetch initial reactions
  useEffect(() => {
    const fetchReactions = async () => {
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from('match_reactions')
          .select('id, match_id, user_id, emoji, created_at')
          .eq('match_id', matchId);

        if (error) {
          throw error;
        }

        setReactions(data || []);
      } catch (err) {
        errorLog('Error fetching match reactions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (matchId) {
      fetchReactions();
    }
  }, [matchId]);

  // Set up realtime subscription
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`match-reactions-${matchId}`)
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
          setReactions((curr) => [...curr, newReaction]);
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

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
        const { error } = await supabase
          .from('match_reactions')
          .delete()
          .eq('id', existingReaction.id)
          .eq('user_id', user.id); // RLS ensures this is the user's reaction

        if (error) {
          throw error;
        }
      } else {
        // Add the new reaction
        const { error } = await supabase.from('match_reactions').insert({
          match_id: matchId,
          user_id: user.id,
          emoji,
        });

        if (error) {
          throw error;
        }
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

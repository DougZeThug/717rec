import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { MessageReactionsService } from '@/services/messages/MessageReactionsService';
import { MessageReaction, ReactionCount } from '@/types/reactions';
import { errorLog } from '@/utils/logger';

export const useMessageReactions = (messageId: string) => {
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
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
        const data = await MessageReactionsService.fetchReactions(messageId);
        setReactions(data);
      } catch (err) {
        errorLog('Error fetching reactions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (messageId) {
      fetchReactions();
    }
  }, [messageId]);

  // Set up realtime subscription
  useEffect(() => {
    if (!messageId) return;

    const channel = supabase
      .channel(`message-reactions-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`,
        },
        (payload) => {
          const newReaction = payload.new as MessageReaction;
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
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`,
        },
        (payload) => {
          const deletedReaction = payload.old as MessageReaction;
          setReactions((curr) => curr.filter((r) => r.id !== deletedReaction.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  // Add reaction
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

    try {
      // Check if the user already added this emoji reaction
      const existingReaction = reactions.find((r) => r.user_id === user.id && r.emoji === emoji);

      if (existingReaction) {
        // If the reaction exists, remove it (toggle behavior)
        return removeReaction(existingReaction.id);
      }

      await MessageReactionsService.addReaction(messageId, user.id, emoji);
    } catch (err) {
      errorLog('Error adding reaction:', err);
      toast({
        title: 'Error',
        description: 'Failed to add reaction',
        variant: 'destructive',
      });
    }
  };

  // Remove reaction
  const removeReaction = async (reactionId: string) => {
    if (!user) return;

    try {
      await MessageReactionsService.removeReaction(reactionId, user.id);
    } catch (err) {
      errorLog('Error removing reaction:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove reaction',
        variant: 'destructive',
      });
    }
  };

  return {
    reactions,
    reactionCounts,
    isLoading,
    addReaction,
    removeReaction,
  };
};

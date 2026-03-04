import { supabase } from '@/integrations/supabase/client';
import { MessageReaction } from '@/types/reactions';
import { handleDatabaseError } from '@/utils/errorHandler';

export const MessageReactionsService = {
  fetchReactions: async (messageId: string): Promise<MessageReaction[]> => {
    const { data, error } = await supabase
      .from('message_reactions')
      .select('id, message_id, user_id, emoji, created_at')
      .eq('message_id', messageId);

    if (error) handleDatabaseError(error, 'Failed to fetch message reactions');
    return data ?? [];
  },

  addReaction: async (messageId: string, userId: string, emoji: string): Promise<void> => {
    const { error } = await supabase.from('message_reactions').insert({
      message_id: messageId,
      user_id: userId,
      emoji,
    });

    if (error) handleDatabaseError(error, 'Failed to add reaction');
  },

  removeReaction: async (reactionId: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('id', reactionId)
      .eq('user_id', userId);

    if (error) handleDatabaseError(error, 'Failed to remove reaction');
  },
};

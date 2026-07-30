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

  /** Upsert a reaction and return the stored row id (null if unavailable). */
  addReaction: async (
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<string | null> => {
    const { data, error } = await supabase
      .from('message_reactions')
      .upsert(
        {
          message_id: messageId,
          user_id: userId,
          emoji,
        },
        { onConflict: 'user_id,message_id,emoji' }
      )
      .select('id')
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to add reaction');
    return data?.id ?? null;
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

import { supabase } from '@/integrations/supabase/client';
import { Message, MessageCategory } from '@/types/reactions';
import { handleDatabaseError } from '@/utils/errorHandler';

export interface MessageQueryOptions {
  limit?: number;
  olderThan?: string | null;
  category?: MessageCategory | null;
  teamId?: string | null;
  searchQuery?: string | null;
}

export const MessageService = {
  fetchMessages: async (
    options: MessageQueryOptions = {},
    signal?: AbortSignal
  ): Promise<Message[]> => {
    const {
      limit = 10,
      olderThan = null,
      category = null,
      teamId = null,
      searchQuery = null,
    } = options;

    // Create a query builder without method chaining initially
    let query = supabase
      .from('messages')
      .select(
        'id, content, created_at, username, team_name, user_id, team_id, category, updated_at, is_edited'
      );

    if (signal) {
      query = query.abortSignal(signal);
    }

    // Apply sorting
    query = query.order('created_at', { ascending: false });

    // Apply limit
    query = query.limit(limit);

    // Apply filters conditionally
    if (olderThan) {
      query = query.lt('created_at', olderThan);
    }

    if (category) {
      query = query.eq('category', category);
    } else {
      query = query.neq('category', 'admin_notification');
    }

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    if (searchQuery) {
      query = query.ilike('content', `%${searchQuery}%`);
    }

    // Execute the query
    const { data, error } = await query;

    if (error) {
      handleDatabaseError(error, 'Failed to fetch messages');
    }

    return data as Message[];
  },

  createMessage: async (data: {
    content: string;
    category: MessageCategory;
    user_id: string;
    username: string;
    team_id: string | null;
    team_name: string | null;
  }): Promise<void> => {
    const { error } = await supabase.from('messages').insert(data);

    if (error) handleDatabaseError(error, 'Failed to create message');
  },

  updateMessage: async (messageId: string, userId: string, content: string): Promise<void> => {
    const { error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', messageId)
      .eq('user_id', userId);

    if (error) handleDatabaseError(error, 'Failed to update message');
  },

  deleteMessage: async (messageId: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', userId);

    if (error) handleDatabaseError(error, 'Failed to delete message');
  },
};

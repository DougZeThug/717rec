import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

export interface MatchReaction {
  id: string;
  match_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export const MatchReactionsService = {
  fetchReactions: async (matchId: string): Promise<MatchReaction[]> => {
    const { data, error } = await supabase
      .from('match_reactions')
      .select('id, match_id, user_id, emoji, created_at')
      .eq('match_id', matchId);

    if (error) handleDatabaseError(error, 'Failed to fetch match reactions');
    return data ?? [];
  },

  insertReaction: async (matchId: string, userId: string, emoji: string): Promise<void> => {
    const { error } = await supabase.from('match_reactions').upsert(
      {
        match_id: matchId,
        user_id: userId,
        emoji,
      },
      { onConflict: 'user_id,match_id,emoji' }
    );

    if (error) handleDatabaseError(error, 'Failed to add reaction');
  },

  deleteReaction: async (reactionId: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('match_reactions')
      .delete()
      .eq('id', reactionId)
      .eq('user_id', userId);

    if (error) handleDatabaseError(error, 'Failed to remove reaction');
  },
};

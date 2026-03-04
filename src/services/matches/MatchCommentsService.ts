import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

export interface MatchComment {
  id: string;
  match_id: string;
  user_id: string;
  username: string;
  team_name: string | null;
  content: string;
  created_at: string;
}

export const MatchCommentsService = {
  fetchComments: async (matchId: string): Promise<MatchComment[]> => {
    const { data, error } = await supabase
      .from('match_comments')
      .select('id, match_id, user_id, username, team_name, content, created_at')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (error) handleDatabaseError(error, 'Failed to fetch match comments');
    return data ?? [];
  },

  addComment: async (
    matchId: string,
    payload: {
      user_id: string;
      username: string;
      team_name: string | null;
      content: string;
    }
  ): Promise<MatchComment> => {
    const { data, error } = await supabase
      .from('match_comments')
      .insert({
        match_id: matchId,
        ...payload,
      })
      .select('id, match_id, user_id, username, team_name, content, created_at')
      .single();

    if (error) handleDatabaseError(error, 'Failed to add comment');
    return data!;
  },

  deleteComment: async (commentId: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('match_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) handleDatabaseError(error, 'Failed to delete comment');
  },
};

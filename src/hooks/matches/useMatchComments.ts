import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { MatchComment, MatchCommentsService } from '@/services/matches/MatchCommentsService';
import { errorLog } from '@/utils/logger';

export type { MatchComment };

export const useMatchComments = (matchId: string) => {
  const [comments, setComments] = useState<MatchComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch comments for the match
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        const data = await MatchCommentsService.fetchComments(matchId);
        setComments(data);
      } catch (err) {
        errorLog('Error fetching match comments:', err);
        setError('Failed to load comments');
      } finally {
        setIsLoading(false);
      }
    };

    if (matchId) {
      fetchComments();
    }
  }, [matchId]);

  // Set up realtime subscription
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`match-comments-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_comments',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newComment = payload.new as MatchComment;
          setComments((curr) => [...curr, newComment]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'match_comments',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setComments((curr) => curr.filter((c) => c.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // Post a new comment
  const addComment = async (content: string) => {
    if (!user) {
      toast({
        title: 'Not signed in',
        description: 'You must be signed in to comment',
        variant: 'destructive',
      });
      return null;
    }

    if (!content.trim()) return null;

    try {
      const { username: profileUsername, teamName } =
        await MatchCommentsService.fetchCommentAuthorInfo(user.id);

      const username =
        profileUsername || user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous';

      const data = await MatchCommentsService.addComment(matchId, {
        user_id: user.id,
        username,
        team_name: teamName,
        content: content.trim(),
      });

      return data;
    } catch (err) {
      errorLog('Error adding comment:', err);
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Delete a comment (only author can delete)
  const deleteComment = async (commentId: string) => {
    if (!user) return false;

    try {
      await MatchCommentsService.deleteComment(commentId, user.id);
      setComments((curr) => curr.filter((c) => c.id !== commentId));
      return true;
    } catch (err) {
      errorLog('Error removing comment:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    comments,
    isLoading,
    error,
    addComment,
    deleteComment,
  };
};

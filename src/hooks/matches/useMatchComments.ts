import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { MatchComment, MatchCommentsService } from '@/services/matches/MatchCommentsService';
import { errorLog } from '@/utils/logger';

import { matchInteractionKeys } from './matchInteractionKeys';

export type { MatchComment };

export const useMatchComments = (matchId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = matchInteractionKeys.comments(matchId);

  const commentsQuery = useQuery({
    queryKey,
    queryFn: () => MatchCommentsService.fetchComments(matchId),
    enabled: Boolean(matchId),
  });

  useEffect(() => {
    if (!commentsQuery.error) return;
    errorLog('Error fetching match comments:', commentsQuery.error);
  }, [commentsQuery.error]);

  useEffect(() => {
    if (!matchId) return;
    const invalidate = () => void queryClient.invalidateQueries({ queryKey });
    const { dispose } = subscribeWithRetry({
      label: `useMatchComments(${matchId})`,
      build: () =>
        supabase
          .channel(`match-comments-${matchId}-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'match_comments',
              filter: `match_id=eq.${matchId}`,
            },
            (payload: { new: unknown; old: { id?: string } }) => {
              const newComment = payload.new as MatchComment;
              queryClient.setQueryData<MatchComment[]>(queryKey, (curr = []) =>
                curr.some((c) => c.id === newComment.id) ? curr : [...curr, newComment]
              );
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
            (payload: { new: unknown; old: { id?: string } }) => {
              queryClient.setQueryData<MatchComment[]>(queryKey, (curr = []) =>
                curr.filter((c) => c.id !== payload.old.id)
              );
            }
          ),
      onReconnect: (isFirst) => {
        if (!isFirst) invalidate();
      },
    });
    return () => dispose();
  }, [matchId, queryClient, queryKey]);

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => MatchCommentsService.deleteComment(commentId, user!.id),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MatchComment[]>(queryKey);
      queryClient.setQueryData<MatchComment[]>(queryKey, (curr = []) =>
        curr.filter((c) => c.id !== commentId)
      );
      return { previous };
    },
    onError: (err, _commentId, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      errorLog('Error removing comment:', err);
      toast({ title: 'Error', description: 'Failed to delete comment', variant: 'destructive' });
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });

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
      queryClient.setQueryData<MatchComment[]>(queryKey, (curr = []) =>
        curr.some((c) => c.id === data.id) ? curr : [...curr, data]
      );
      return data;
    } catch (err) {
      errorLog('Error adding comment:', err);
      toast({ title: 'Error', description: 'Failed to post comment', variant: 'destructive' });
      return null;
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return false;
    try {
      await deleteMutation.mutateAsync(commentId);
      return true;
    } catch {
      return false;
    }
  };

  return {
    comments: commentsQuery.data ?? [],
    isLoading: commentsQuery.isLoading,
    error: commentsQuery.error ? 'Failed to load comments' : null,
    addComment,
    deleteComment,
  };
};

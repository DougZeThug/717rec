import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { MatchComment, MatchCommentsService } from '@/services/matches/MatchCommentsService';
import { errorLog } from '@/utils/logger';

import { matchInteractionKeys } from './matchInteractionKeys';

export type { MatchComment };

interface RealtimeCommentBuffers {
  inserts: Map<string, MatchComment>;
  deletes: Set<string>;
}

/** Subscribe to, fetch, create, and delete comments for a match through the query cache. */
export const useMatchComments = (matchId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = user?.id;
  const queryKey = useMemo(() => matchInteractionKeys.comments(matchId), [matchId]);
  const realtimeBuffersRef = useRef<Map<string, RealtimeCommentBuffers>>(new Map());

  /** Get realtime insert/delete buffers scoped to a single match. */
  const getRealtimeBuffers = useCallback((bufferMatchId: string) => {
    let buffers = realtimeBuffersRef.current.get(bufferMatchId);
    if (!buffers) {
      buffers = { inserts: new Map(), deletes: new Set() };
      realtimeBuffersRef.current.set(bufferMatchId, buffers);
    }
    return buffers;
  }, []);

  useEffect(() => {
    const buffers = getRealtimeBuffers(matchId);
    buffers.inserts.clear();
    buffers.deletes.clear();
  }, [getRealtimeBuffers, matchId]);

  const commentsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const fetched = await MatchCommentsService.fetchComments(matchId);
      const buffers = getRealtimeBuffers(matchId);
      const byId = new Map(fetched.map((comment) => [comment.id, comment]));
      buffers.inserts.forEach((comment, id) => {
        byId.set(id, comment);
      });
      buffers.deletes.forEach((id) => {
        byId.delete(id);
      });
      return Array.from(byId.values());
    },
    enabled: Boolean(matchId),
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (!commentsQuery.error) return;
    errorLog('Error fetching match comments:', commentsQuery.error);
  }, [commentsQuery.error]);

  useEffect(() => {
    if (!matchId) return;
    /** Mark match comments stale after realtime reconnects. */
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey }).catch((err: unknown) => {
        errorLog('Error invalidating match comments:', err);
      });
    };
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
              const buffers = getRealtimeBuffers(matchId);
              buffers.deletes.delete(newComment.id);
              buffers.inserts.set(newComment.id, newComment);
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
              const buffers = getRealtimeBuffers(matchId);
              if (payload.old.id) {
                buffers.inserts.delete(payload.old.id);
                buffers.deletes.add(payload.old.id);
              }
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
  }, [getRealtimeBuffers, matchId, queryClient, queryKey]);

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      currentUserId
        ? MatchCommentsService.deleteComment(commentId, currentUserId)
        : Promise.reject(new Error('User is required to delete a comment')),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MatchComment[]>(queryKey);
      const removedComment = previous?.find((comment) => comment.id === commentId);
      queryClient.setQueryData<MatchComment[]>(queryKey, (curr = []) =>
        curr.filter((c) => c.id !== commentId)
      );
      return { removedComment };
    },
    onError: (err, _commentId, context) => {
      if (context?.removedComment) {
        const removedComment = context.removedComment;
        queryClient.setQueryData<MatchComment[]>(queryKey, (curr = []) =>
          curr.some((comment) => comment.id === removedComment.id)
            ? curr
            : [...curr, removedComment]
        );
      }
      errorLog('Error removing comment:', err);
      toast({ title: 'Error', description: 'Failed to delete comment', variant: 'destructive' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey, refetchType: 'active' }),
  });

  /** Add a trimmed comment for the current user and patch the cached list. */
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

  /** Delete a comment owned by the current user with optimistic cache removal. */
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

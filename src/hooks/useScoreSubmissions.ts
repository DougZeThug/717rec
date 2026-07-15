import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useToast } from '@/hooks/useToast';
import { fetchScoreSubmissions as fetchScoreSubmissionsData } from '@/services/matches/MatchReadService';
import { updateScoreSubmissionStatus } from '@/services/matches/MatchWriteService';
import { errorLog } from '@/utils/logger';

import { scoreSubmissionKeys } from './scoreSubmissionKeys';

export interface ScoreSubmission {
  id: string;
  match_id: string;
  submitter_name: string;
  submitter_team: string | null;
  message: string;
  status: string;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

/**
 * Load and moderate pending score submissions with shared query caching.
 */
export function useScoreSubmissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pendingModerationsRef = useRef(0);

  const submissionsQuery = useQuery({
    queryKey: scoreSubmissionKeys.all,
    queryFn: async () => (await fetchScoreSubmissionsData()) as ScoreSubmission[],
    refetchOnMount: 'always',
  });

  const actionMutation = useMutation({
    mutationFn: ({
      submissionId,
      status,
    }: {
      submissionId: string;
      status: 'approved' | 'rejected';
    }) => updateScoreSubmissionStatus(submissionId, status),
    onMutate: async ({ submissionId }) => {
      pendingModerationsRef.current += 1;
      await queryClient.cancelQueries({ queryKey: scoreSubmissionKeys.all });
      const previous = queryClient.getQueryData<ScoreSubmission[]>(scoreSubmissionKeys.all);
      const removedIndex = previous?.findIndex((sub) => sub.id === submissionId) ?? -1;
      const removedSubmission = removedIndex >= 0 ? previous?.[removedIndex] : undefined;
      queryClient.setQueryData<ScoreSubmission[]>(scoreSubmissionKeys.all, (curr = []) =>
        curr.filter((sub) => sub.id !== submissionId)
      );
      return { removedIndex, removedSubmission };
    },
    onSuccess: (_data, { status }) => {
      toast({ title: 'Success', description: `Score submission ${status} successfully.` });
    },
    onError: (error, { status }, context) => {
      if (context?.removedSubmission) {
        const removedSubmission = context.removedSubmission;
        const restoreIndex = context.removedIndex >= 0 ? context.removedIndex : 0;
        queryClient.setQueryData<ScoreSubmission[]>(scoreSubmissionKeys.all, (curr = []) => {
          if (curr.some((sub) => sub.id === removedSubmission.id)) return curr;
          const next = [...curr];
          next.splice(Math.min(restoreIndex, next.length), 0, removedSubmission);
          return next;
        });
      }
      errorLog(`Error ${status === 'approved' ? 'approving' : 'rejecting'} submission:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${status === 'approved' ? 'approve' : 'reject'} submission. Please try again.`,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      pendingModerationsRef.current = Math.max(0, pendingModerationsRef.current - 1);
      queryClient
        .invalidateQueries({
          queryKey: scoreSubmissionKeys.all,
          refetchType: pendingModerationsRef.current === 0 ? 'active' : 'none',
        })
        .catch((err: unknown) => {
          errorLog('Error invalidating score submissions:', err);
        });
    },
  });

  useEffect(() => {
    if (!submissionsQuery.error) return;
    errorLog('Error fetching score submissions:', submissionsQuery.error);
    toast({
      title: 'Error',
      description: 'Failed to load score submissions. Please try again.',
      variant: 'destructive',
    });
  }, [submissionsQuery.error, toast]);

  /** Apply an approval or rejection to a score submission. */
  const handleSubmissionAction = (submissionId: string, status: 'approved' | 'rejected') => {
    actionMutation.mutate({ submissionId, status });
  };

  return {
    submissions: submissionsQuery.data ?? [],
    isLoading: submissionsQuery.isLoading,
    handleApproveSubmission: (submissionId: string) =>
      handleSubmissionAction(submissionId, 'approved'),
    handleRejectSubmission: (submissionId: string) =>
      handleSubmissionAction(submissionId, 'rejected'),
    refetch: submissionsQuery.refetch,
  };
}

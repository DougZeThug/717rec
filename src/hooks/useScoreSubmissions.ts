import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

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

  const submissionsQuery = useQuery({
    queryKey: scoreSubmissionKeys.all,
    queryFn: async () => (await fetchScoreSubmissionsData()) as ScoreSubmission[],
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
      await queryClient.cancelQueries({ queryKey: scoreSubmissionKeys.all });
      const previous = queryClient.getQueryData<ScoreSubmission[]>(scoreSubmissionKeys.all);
      queryClient.setQueryData<ScoreSubmission[]>(scoreSubmissionKeys.all, (curr = []) =>
        curr.filter((sub) => sub.id !== submissionId)
      );
      return { previous };
    },
    onSuccess: (_data, { status }) => {
      toast({ title: 'Success', description: `Score submission ${status} successfully.` });
    },
    onError: (error, { status }, context) => {
      if (context?.previous) queryClient.setQueryData(scoreSubmissionKeys.all, context.previous);
      errorLog(`Error ${status === 'approved' ? 'approving' : 'rejecting'} submission:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${status === 'approved' ? 'approve' : 'reject'} submission. Please try again.`,
        variant: 'destructive',
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: scoreSubmissionKeys.all }),
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
  const handleSubmissionAction = (submissionId: string, status: 'approved' | 'rejected') =>
    actionMutation.mutateAsync({ submissionId, status });

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

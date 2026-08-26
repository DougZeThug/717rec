import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useMatchSubmission } from '@/hooks/matches/useMatchSubmission';
import { useToast } from '@/hooks/useToast';
import {
  fetchScoreSubmissions as fetchScoreSubmissionsData,
  type ScoreSubmissionWithMatch,
} from '@/services/matches/MatchReadService';
import { updateScoreSubmissionStatus } from '@/services/matches/MatchWriteService';
import { errorLog } from '@/utils/logger';

import { scoreSubmissionKeys } from './scoreSubmissionKeys';

/** A pending score submission, with the match and team names it reports on. */
export type ScoreSubmission = ScoreSubmissionWithMatch;

/**
 * The result an admin reads off a submission's message and confirms.
 * `winner` is which side of the match won; game wins are the games each
 * team took in the series.
 */
export interface ApproveSubmissionInput {
  submissionId: string;
  matchId: string;
  winner: 1 | 2;
  team1GameWins: number;
  team2GameWins: number;
}

/**
 * Load and moderate pending score submissions with shared query caching.
 */
export function useScoreSubmissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pendingModerationsRef = useRef(0);
  const { handleSubmitScore } = useMatchSubmission();

  const submissionsQuery = useQuery({
    queryKey: scoreSubmissionKeys.all,
    queryFn: async () => (await fetchScoreSubmissionsData()) as ScoreSubmission[],
    refetchOnMount: 'always',
  });

  /** Optimistically drop the row from the queue and remember where it sat. */
  const removeOptimistically = async (submissionId: string) => {
    pendingModerationsRef.current += 1;
    await queryClient.cancelQueries({ queryKey: scoreSubmissionKeys.all });
    const previous = queryClient.getQueryData<ScoreSubmission[]>(scoreSubmissionKeys.all);
    const removedIndex = previous?.findIndex((sub) => sub.id === submissionId) ?? -1;
    const removedSubmission = removedIndex >= 0 ? previous?.[removedIndex] : undefined;
    queryClient.setQueryData<ScoreSubmission[]>(scoreSubmissionKeys.all, (curr = []) =>
      curr.filter((sub) => sub.id !== submissionId)
    );
    return { removedIndex, removedSubmission };
  };

  /** Put a row back in the queue after a failed moderation. */
  const restoreOptimistic = (context?: {
    removedIndex: number;
    removedSubmission?: ScoreSubmission;
  }) => {
    if (!context?.removedSubmission) return;
    const removedSubmission = context.removedSubmission;
    const restoreIndex = context.removedIndex >= 0 ? context.removedIndex : 0;
    queryClient.setQueryData<ScoreSubmission[]>(scoreSubmissionKeys.all, (curr = []) => {
      if (curr.some((sub) => sub.id === removedSubmission.id)) return curr;
      const next = [...curr];
      next.splice(Math.min(restoreIndex, next.length), 0, removedSubmission);
      return next;
    });
  };

  const settleModeration = () => {
    pendingModerationsRef.current = Math.max(0, pendingModerationsRef.current - 1);
    queryClient
      .invalidateQueries({
        queryKey: scoreSubmissionKeys.all,
        refetchType: pendingModerationsRef.current === 0 ? 'active' : 'none',
      })
      .catch((err: unknown) => {
        errorLog('Error invalidating score submissions:', err);
      });
  };

  const approveMutation = useMutation({
    mutationFn: async ({
      submissionId,
      matchId,
      winner,
      team1GameWins,
      team2GameWins,
    }: ApproveSubmissionInput) => {
      // Record the result on the match FIRST. Match scores are binary — 1 for
      // the winning side, 0 for the losing side — and the games each team won
      // travel separately.
      const recorded = await handleSubmitScore(
        {
          matchId,
          team1Score: winner === 1 ? 1 : 0,
          team2Score: winner === 1 ? 0 : 1,
          team1GameWins,
          team2GameWins,
        },
        { suppressToast: true }
      );

      // Only mark the submission reviewed once the match really carries the
      // result. Otherwise the queue would clear while standings stayed stale.
      if (!recorded) {
        throw new Error('Failed to record the match result');
      }

      await updateScoreSubmissionStatus(submissionId, 'approved');
    },
    onMutate: ({ submissionId }) => removeOptimistically(submissionId),
    onSuccess: () => {
      toast({
        title: 'Result Recorded',
        description: 'The match result is saved and the submission is approved.',
      });
    },
    onError: (error, _variables, context) => {
      restoreOptimistic(context);
      errorLog('Error approving submission:', error);
      toast({
        title: 'Error',
        description: 'Failed to record the result. The submission is still pending.',
        variant: 'destructive',
      });
    },
    onSettled: settleModeration,
  });

  const rejectMutation = useMutation({
    mutationFn: ({ submissionId }: { submissionId: string }) =>
      updateScoreSubmissionStatus(submissionId, 'rejected'),
    onMutate: ({ submissionId }) => removeOptimistically(submissionId),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Score submission rejected successfully.' });
    },
    onError: (error, _variables, context) => {
      restoreOptimistic(context);
      errorLog('Error rejecting submission:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject submission. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: settleModeration,
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

  return {
    submissions: submissionsQuery.data ?? [],
    isLoading: submissionsQuery.isLoading,
    isApproving: approveMutation.isPending,
    /** Record the admin-confirmed result, then approve the submission. */
    handleApproveSubmission: (input: ApproveSubmissionInput) => approveMutation.mutate(input),
    handleRejectSubmission: (submissionId: string) => rejectMutation.mutate({ submissionId }),
    refetch: submissionsQuery.refetch,
  };
}

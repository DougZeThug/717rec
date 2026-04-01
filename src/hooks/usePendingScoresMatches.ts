import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import { fetchPendingScoresMatches } from '@/services/matches/MatchReadService';
import { createScoreSubmission } from '@/services/matches/MatchWriteService';
import { errorLog } from '@/utils/logger';

export interface PendingMatch {
  id: string;
  team1_id: string;
  team2_id: string;
  team1_name: string;
  team2_name: string;
  team1_logo: string | null;
  team2_logo: string | null;
  date: string;
  location?: string;
}

export interface ScoreSubmission {
  submitter_name: string;
  submitter_team?: string;
  message: string;
}

export function usePendingScoresMatches() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: matches = [],
    isLoading,
    refetch,
  } = useQuery<PendingMatch[]>({
    queryKey: ['matches', 'pending-scores'],
    queryFn: async () => {
      let data;
      try {
        data = await fetchPendingScoresMatches();
      } catch (error) {
        errorLog('Error fetching pending matches:', error);
        toast({
          title: 'Error',
          description: 'Failed to load pending matches. Please try again.',
          variant: 'destructive',
        });
        throw error;
      }

      return data.map((match) => ({
        id: match.id,
        team1_id: match.team1_id || '',
        team2_id: match.team2_id || '',
        team1_name: match.team1_name || '',
        team2_name: match.team2_name || '',
        team1_logo: match.team1_logo,
        team2_logo: match.team2_logo,
        date: match.date || '',
        location: match.location || '',
      }));
    },
    staleTime: 0, // Always fresh - instant updates
  });

  const submitMutation = useMutation({
    mutationFn: async ({
      matchId,
      submission,
    }: {
      matchId: string;
      submission: ScoreSubmission;
    }) => {
      await createScoreSubmission({
        match_id: matchId,
        submitter_name: submission.submitter_name,
        submitter_team: submission.submitter_team || null,
        message: submission.message,
      });
      return true;
    },
    onSuccess: () => {
      toast({
        title: 'Score Submitted',
        description: 'Your score report has been submitted for admin review.',
      });
      // Optionally invalidate queries if needed
      queryClient.invalidateQueries({ queryKey: ['matches', 'pending-scores'] });
    },
    onError: (error) => {
      errorLog('Error submitting score:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit score. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const submitScore = async (matchId: string, submission: ScoreSubmission): Promise<boolean> => {
    try {
      await submitMutation.mutateAsync({ matchId, submission });
      return true;
    } catch (error) {
      // Error toast already shown by mutation's onError callback
      throw error;
    }
  };

  return {
    matches,
    isLoading,
    isSubmitting: submitMutation.isPending,
    submitScore,
    refetch,
  };
}

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { fetchScoreSubmissions as fetchScoreSubmissionsData } from '@/services/matches/MatchReadService';
import { updateScoreSubmissionStatus } from '@/services/matches/MatchWriteService';
import { errorLog } from '@/utils/logger';

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

export function useScoreSubmissions() {
  const [submissions, setSubmissions] = useState<ScoreSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchScoreSubmissions();
  }, []);

  const fetchScoreSubmissions = async () => {
    try {
      setIsLoading(true);
      const data = await fetchScoreSubmissionsData();
      setSubmissions(data as ScoreSubmission[]);
    } catch (error) {
      errorLog('Error fetching score submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load score submissions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmissionAction = async (submissionId: string, status: 'approved' | 'rejected') => {
    try {
      await updateScoreSubmissionStatus(submissionId, status);

      setSubmissions((prev) => prev.filter((sub) => sub.id !== submissionId));

      toast({
        title: 'Success',
        description: `Score submission ${status} successfully.`,
      });
    } catch (error) {
      errorLog(`Error ${status === 'approved' ? 'approving' : 'rejecting'} submission:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${status === 'approved' ? 'approve' : 'reject'} submission. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  const handleApproveSubmission = (submissionId: string) =>
    handleSubmissionAction(submissionId, 'approved');

  const handleRejectSubmission = (submissionId: string) =>
    handleSubmissionAction(submissionId, 'rejected');

  return {
    submissions,
    isLoading,
    handleApproveSubmission,
    handleRejectSubmission,
    refetch: fetchScoreSubmissions,
  };
}

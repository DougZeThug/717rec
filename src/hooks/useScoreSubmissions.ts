import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase
        .from('score_submissions')
        .select('id, match_id, submitter_name, submitter_team, message, status, created_at, reviewed_by, reviewed_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSubmissions(data || []);
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

  const handleSubmissionAction = async (
    submissionId: string,
    status: 'approved' | 'rejected'
  ) => {
    try {
      const { error } = await supabase
        .from('score_submissions')
        .update({
          status,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (error) throw error;

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

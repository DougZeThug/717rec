import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching score submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load score submissions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveSubmission = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('score_submissions')
        .update({
          status: 'approved',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
      
      toast({
        title: 'Success',
        description: 'Score submission approved successfully.',
      });
    } catch (error) {
      console.error('Error approving submission:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve submission. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRejectSubmission = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('score_submissions')
        .update({
          status: 'rejected',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
      
      toast({
        title: 'Success',
        description: 'Score submission rejected.',
      });
    } catch (error) {
      console.error('Error rejecting submission:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject submission. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return {
    submissions,
    isLoading,
    handleApproveSubmission,
    handleRejectSubmission,
    refetch: fetchScoreSubmissions
  };
}
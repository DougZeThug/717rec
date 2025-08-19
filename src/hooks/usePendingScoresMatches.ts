import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const [matches, setMatches] = useState<PendingMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchPendingMatches();
  }, []);

  const fetchPendingMatches = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('v_pending_matches')
        .select('*')
        .limit(10);

      if (error) throw error;

      const transformedMatches: PendingMatch[] = (data || []).map(match => ({
        id: match.id,
        team1_id: match.team1_id || '',
        team2_id: match.team2_id || '',
        team1_name: match.team1_name || '',
        team2_name: match.team2_name || '',
        team1_logo: match.team1_logo,
        team2_logo: match.team2_logo,
        date: match.date || '',
        location: match.location || ''
      }));
      
      setMatches(transformedMatches);
    } catch (error) {
      console.error('Error fetching pending matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending matches. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitScore = async (matchId: string, submission: ScoreSubmission) => {
    // Check authentication first
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to submit score reports. Please sign in and try again.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('score_submissions')
        .insert({
          match_id: matchId,
          submitter_name: submission.submitter_name,
          submitter_team: submission.submitter_team || null,
          message: submission.message
        });

      if (error) throw error;

      toast({
        title: 'Score Submitted',
        description: 'Your score report has been submitted for admin review.',
      });

      return true;
    } catch (error) {
      console.error('Error submitting score:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit score. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    matches,
    isLoading,
    isSubmitting,
    submitScore,
    refetch: fetchPendingMatches
  };
}
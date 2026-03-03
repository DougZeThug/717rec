import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { errorLog } from '@/utils/logger';

export interface TeamAnalysis {
  id: string;
  team_id: string;
  overall: string | null;
  strengths: string[];
  weaknesses: string[];
  trends: string | null;
  rivalry_insights: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamAnalysisInput {
  overall?: string;
  strengths?: string[];
  weaknesses?: string[];
  trends?: string;
  rivalry_insights?: string;
}

export const useTeamAnalysis = (teamId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['team-analysis', teamId],
    queryFn: async (): Promise<TeamAnalysis | null> => {
      if (!teamId) return null;

      const { data, error } = await supabase
        .from('team_analysis')
        .select('id, team_id, overall, strengths, weaknesses, trends, rivalry_insights, created_at, updated_at')
        .eq('team_id', teamId)
        .maybeSingle();

      if (error) {
        errorLog('Error fetching team analysis:', error);
        throw error;
      }

      return data as TeamAnalysis | null;
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: TeamAnalysisInput) => {
      if (!teamId) throw new Error('Team ID is required');
      if (!user) throw new Error('Must be logged in');

      // Use upsert to avoid check-then-act pattern and reduce queries
      const { data, error } = await supabase
        .from('team_analysis')
        .upsert(
          {
            team_id: teamId,
            ...input,
            created_by: user.id,
            updated_by: user.id,
          },
          {
            onConflict: 'team_id',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-analysis', teamId] });
      toast({
        title: 'Analysis saved',
        description: 'Team analysis has been updated successfully.',
      });
    },
    onError: (error) => {
      errorLog('Error saving team analysis:', error);
      toast({
        title: 'Error saving analysis',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    analysis: query.data,
    isLoading: query.isLoading,
    error: query.error,
    saveAnalysis: upsertMutation.mutate,
    isSaving: upsertMutation.isPending,
  };
};

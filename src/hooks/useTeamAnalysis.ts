import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useToast';
import {
  fetchTeamAnalysis,
  type TeamAnalysis,
  type TeamAnalysisInput,
  upsertTeamAnalysis,
} from '@/services/teams/TeamFetchService';
import { errorLog } from '@/utils/logger';

// Re-export types for any existing consumers
export type { TeamAnalysis, TeamAnalysisInput };

export const useTeamAnalysis = (teamId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['team-analysis', teamId],
    queryFn: (): Promise<TeamAnalysis | null> => {
      if (!teamId) return Promise.resolve(null);
      return fetchTeamAnalysis(teamId);
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: TeamAnalysisInput) => {
      if (!teamId) throw new Error('Team ID is required');
      if (!user) throw new Error('Must be logged in');

      return upsertTeamAnalysis(teamId, input, user.id, user.id);
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

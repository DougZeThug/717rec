import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import { createTeamApi, deleteTeamApi, updateTeamApi } from '@/services/TeamService';
import { Team } from '@/types';
import { errorLog } from '@/utils/logger';

type TeamInput = Omit<Team, 'id' | 'created_at'>;

export function useTeamMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidateTeamQueries = (teamId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    if (teamId) {
      queryClient.invalidateQueries({ queryKey: ['team-details', teamId] });
    }
  };

  const createMutation = useMutation({
    mutationFn: (teamData: TeamInput) => createTeamApi(teamData),
    onSuccess: (newTeam) => {
      invalidateTeamQueries();
      toast({
        title: 'Team Created',
        description: `${newTeam.name} has been successfully created.`,
      });
    },
    onError: (error) => {
      errorLog('Error creating team:', error);
      toast({
        title: 'Error',
        description: 'Failed to create team. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ teamId, teamData }: { teamId: string; teamData: TeamInput }) =>
      updateTeamApi(teamId, teamData),
    onSuccess: (updatedTeam, { teamId }) => {
      invalidateTeamQueries(teamId);
      toast({
        title: 'Team Updated',
        description: `${updatedTeam.name} has been successfully updated.`,
      });
    },
    onError: (error) => {
      errorLog('Error updating team:', error);
      let errorMessage = 'Failed to update team. Please try again.';

      if (error instanceof Error && error.message) {
        if (error.message.includes('division_id')) {
          errorMessage = 'Invalid division selected. Please choose a valid division.';
        } else if (error.message.includes('not found')) {
          errorMessage = error.message;
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (teamId: string) => deleteTeamApi(teamId),
    onSuccess: (_result, teamId) => {
      invalidateTeamQueries(teamId);
    },
    onError: (error) => {
      errorLog('Error deleting team:', error);
    },
  });

  return {
    createTeam: (teamData: TeamInput) => createMutation.mutateAsync(teamData),
    updateTeam: (teamId: string, teamData: TeamInput) =>
      updateMutation.mutateAsync({ teamId, teamData }),
    deleteTeam: async (teamId: string) => {
      await deleteMutation.mutateAsync(teamId);
      return true;
    },
  };
}

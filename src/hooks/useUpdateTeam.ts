import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateTeamApi } from '@/services/TeamService';
import { Team } from '@/types';

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      teamId,
      teamData,
    }: {
      teamId: string;
      teamData: Omit<Team, 'id' | 'created_at'>;
    }) => updateTeamApi(teamId, teamData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  return {
    updateTeam: (teamId: string, teamData: Omit<Team, 'id' | 'created_at'>) =>
      mutation.mutateAsync({ teamId, teamData }),
    isUpdating: mutation.isPending,
  };
};

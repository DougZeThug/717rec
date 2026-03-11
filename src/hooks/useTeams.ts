import { useTeamsArray } from './teams';
import { useTeamMutations } from './useTeamMutations';

export function useTeams() {
  const { teams, isLoading, fetchTeams } = useTeamsArray();
  const { createTeam, updateTeam, deleteTeam } = useTeamMutations();

  return {
    teams,
    isLoading,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
  };
}

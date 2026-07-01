import { useTeamsArray } from './teams';
import { useTeamMutations } from './useTeamMutations';

export function useTeams() {
  const { teams, isLoading, error, fetchTeams } = useTeamsArray();
  const { createTeam, updateTeam, deleteTeam } = useTeamMutations();

  return {
    teams,
    isLoading,
    error,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
  };
}

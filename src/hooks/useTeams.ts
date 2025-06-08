
import { Team } from "@/types";
import { useTeamsData } from "./useTeamsData";
import { useTeamMutations } from "./useTeamMutations";

export function useTeams(includeHidden: boolean = false) {
  const { teams, isLoading, fetchTeams } = useTeamsData(includeHidden);
  const { createTeam, updateTeam, deleteTeam } = useTeamMutations();

  return {
    teams,
    isLoading,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam
  };
}


import { Team } from "@/types";
import { useTeamsData } from "./useTeamsData";
import { useTeamMutations } from "./useTeamMutations";

export function useTeams() {
  const { teams, isLoading, fetchTeams } = useTeamsData();
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

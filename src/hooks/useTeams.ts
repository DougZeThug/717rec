
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Team } from "@/types";
import { 
  fetchTeamsFromApi, 
  createTeamApi, 
  updateTeamApi, 
  deleteTeamApi 
} from "@/services/TeamService";

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      
      const teamsData = await fetchTeamsFromApi();

      setTeams(teamsData);
      console.log("Teams fetched successfully:", teamsData);
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast({
        title: "Error",
        description: "Failed to fetch teams. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTeam = async (teamData: Omit<Team, "id" | "created_at">) => {
    try {
      const newTeam = await createTeamApi(teamData);
      
      setTeams([...teams, newTeam]);
      toast({
        title: "Team Created",
        description: `${newTeam.name} has been successfully created.`,
      });
      
      return newTeam;
    } catch (error) {
      console.error("Error creating team:", error);
      toast({
        title: "Error",
        description: "Failed to create team. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateTeam = async (teamId: string, teamData: Omit<Team, "id" | "created_at">) => {
    try {
      const updatedTeam = await updateTeamApi(teamId, teamData);
      
      setTeams(teams.map(team => team.id === updatedTeam.id ? updatedTeam : team));
      
      toast({
        title: "Team Updated",
        description: `${updatedTeam.name} has been successfully updated.`,
      });
      
      return updatedTeam;
    } catch (error) {
      console.error("Error updating team:", error);
      toast({
        title: "Error",
        description: "Failed to update team. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteTeam = async (teamId: string) => {
    try {
      await deleteTeamApi(teamId);
      
      setTeams(teams.filter(team => team.id !== teamId));
      
      toast({
        title: "Team Deleted",
        description: "The team has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting team:", error);
      toast({
        title: "Error",
        description: "Failed to delete team. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    teams,
    isLoading,
    createTeam,
    updateTeam,
    deleteTeam
  };
}

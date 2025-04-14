
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
      console.log("Fetching teams...");
      
      const teamsData = await fetchTeamsFromApi();

      console.log("Teams data received:", teamsData);
      setTeams(teamsData);
      
      if (teamsData.length === 0) {
        toast({
          title: "No Teams Found",
          description: "No teams were found in the database.",
          variant: "destructive"
        });
      } else {
        console.log(`Successfully loaded ${teamsData.length} teams`);
      }
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
      console.log("Updating team:", teamId, teamData);
      
      const updatedTeam = await updateTeamApi(teamId, teamData);
      
      setTeams(teams.map(team => team.id === updatedTeam.id ? updatedTeam : team));
      
      toast({
        title: "Team Updated",
        description: `${updatedTeam.name} has been successfully updated.`,
      });
      
      return updatedTeam;
    } catch (error: any) {
      console.error("Error updating team:", error);
      
      // Enhanced error message based on the error details
      let errorMessage = "Failed to update team. Please try again.";
      
      if (error?.message) {
        if (error.message.includes("division_id") || error.message.includes("division")) {
          errorMessage = "Invalid division selected. Please choose a valid division.";
        } else if (error.message.includes("foreign key constraint")) {
          errorMessage = "The selected division does not exist.";
        } else if (error.message.includes("not found")) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteTeam = async (teamId: string) => {
    try {
      // Find team to get name before deletion
      const teamToDelete = teams.find(team => team.id === teamId);
      
      // Delete team from database and storage
      await deleteTeamApi(teamId);
      
      // Update UI by removing the deleted team
      setTeams(prevTeams => prevTeams.filter(team => team.id !== teamId));
      
      return true;
    } catch (error) {
      console.error("Error deleting team:", error);
      throw error;
    }
  };

  return {
    teams,
    isLoading,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam
  };
}


import { Team } from "@/types";
import { createTeamApi, updateTeamApi, deleteTeamApi } from "@/services/TeamService";
import { useToast } from "@/hooks/use-toast";
import { errorLog } from "@/utils/logger";

export function useTeamMutations() {
  const { toast } = useToast();

  const createTeam = async (teamData: Omit<Team, "id" | "created_at">) => {
    try {
      const newTeam = await createTeamApi(teamData);
      toast({
        title: "Team Created",
        description: `${newTeam.name} has been successfully created.`,
      });
      return newTeam;
    } catch (error) {
      errorLog("Error creating team:", error);
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
      toast({
        title: "Team Updated",
        description: `${updatedTeam.name} has been successfully updated.`,
      });
      return updatedTeam;
    } catch (error) {
      errorLog("Error updating team:", error);
      let errorMessage = "Failed to update team. Please try again.";
      
      if (error instanceof Error && error.message) {
        if (error.message.includes("division_id")) {
          errorMessage = "Invalid division selected. Please choose a valid division.";
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
      await deleteTeamApi(teamId);
      return true;
    } catch (error) {
      errorLog("Error deleting team:", error);
      throw error;
    }
  };

  return {
    createTeam,
    updateTeam,
    deleteTeam
  };
}

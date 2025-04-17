
import { useState } from 'react';
import { Team } from "@/types";
import { useTeams } from "@/hooks/useTeams";
import { useToast } from "@/hooks/use-toast";

export function useTeamManagement() {
  const { teams, isLoading, fetchTeams, updateTeam, deleteTeam } = useTeams();
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { toast } = useToast();

  const handleUpdateTeam = async (teamData: Omit<Team, "id" | "created_at">) => {
    if (!teamToEdit) return;
    try {
      await updateTeam(teamToEdit.id, teamData);
      setTeamToEdit(null);
    } catch (error) {
      console.error("Error updating team:", error);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deleteTeamId) return;
    
    setIsDeleting(true);
    try {
      await deleteTeam(deleteTeamId);
      setDeleteTeamId(null);
      toast({
        title: "Team Deleted",
        description: "The team has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting team:", error);
      toast({
        title: "Deletion Failed",
        description: "There was a problem deleting the team. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchTeams();
      toast({
        title: "Teams Refreshed",
        description: "Team list has been refreshed successfully.",
      });
    } catch (error) {
      console.error("Error refreshing teams:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    teams,
    isLoading,
    teamToEdit,
    setTeamToEdit,
    deleteTeamId,
    setDeleteTeamId,
    isFormOpen,
    setIsFormOpen,
    isRefreshing,
    isDeleting,
    handleUpdateTeam,
    handleDeleteTeam,
    handleRefresh
  };
}

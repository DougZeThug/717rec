
import React, { useState, useEffect } from 'react';
import { Team } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import TeamForm from "@/components/teams/TeamForm";
import { TeamList } from "@/components/teams/TeamList";
import { TeamDeleteDialog } from "@/components/teams/TeamDeleteDialog";
import { useTeams } from "@/hooks/useTeams";
import { useToast } from "@/hooks/use-toast";

const Teams: React.FC = () => {
  const { teams, isLoading, fetchTeams, createTeam, updateTeam, deleteTeam } = useTeams();
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { toast } = useToast();

  const handleCreateTeam = async (teamData: Omit<Team, "id" | "created_at">) => {
    try {
      await createTeam(teamData);
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error creating team:", error);
    }
  };

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

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Teams</h1>
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline"
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} /> 
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button 
            onClick={() => setIsFormOpen(true)} 
            className="flex items-center gap-2"
          >
            <Plus size={16} /> Add Team
          </Button>
        </div>
      </div>

      {(isFormOpen || teamToEdit) && (
        <div className="mb-8 p-6 bg-card border rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {teamToEdit ? "Edit Team" : "Create New Team"}
          </h2>
          <TeamForm 
            team={teamToEdit || undefined}
            onSubmit={teamToEdit ? handleUpdateTeam : handleCreateTeam} 
            onCancel={() => {
              setIsFormOpen(false);
              setTeamToEdit(null);
            }}
          />
        </div>
      )}

      <TeamList 
        teams={teams}
        isLoading={isLoading}
        onEdit={(team) => setTeamToEdit(team)}
        onDelete={(teamId) => setDeleteTeamId(teamId)}
      />

      <TeamDeleteDialog 
        isOpen={!!deleteTeamId}
        onClose={() => setDeleteTeamId(null)}
        onConfirm={handleDeleteTeam}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default Teams;

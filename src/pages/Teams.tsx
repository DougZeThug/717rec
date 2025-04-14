
import React, { useState } from 'react';
import { Team } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TeamForm from "@/components/teams/TeamForm";
import { TeamList } from "@/components/teams/TeamList";
import { TeamDeleteDialog } from "@/components/teams/TeamDeleteDialog";
import { useTeams } from "@/hooks/useTeams";

const Teams: React.FC = () => {
  const { teams, isLoading, createTeam, updateTeam, deleteTeam } = useTeams();
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);

  const handleCreateTeam = async (teamData: Omit<Team, "id" | "created_at">) => {
    await createTeam(teamData);
    setIsFormOpen(false);
  };

  const handleUpdateTeam = async (teamData: Omit<Team, "id" | "created_at">) => {
    if (!teamToEdit) return;
    await updateTeam(teamToEdit.id, teamData);
    setTeamToEdit(null);
  };

  const handleDeleteTeam = async () => {
    if (!deleteTeamId) return;
    await deleteTeam(deleteTeamId);
    setDeleteTeamId(null);
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Teams</h1>
        <Button 
          onClick={() => setIsFormOpen(true)} 
          className="flex items-center gap-2"
        >
          <Plus size={16} /> Add Team
        </Button>
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
      />
    </div>
  );
};

export default Teams;

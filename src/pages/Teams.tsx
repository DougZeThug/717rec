
import React, { useState } from 'react';
import { Team } from "@/types";
import TeamForm from "@/components/teams/TeamForm";
import { TeamDeleteDialog } from "@/components/teams/TeamDeleteDialog";
import { TeamList } from "@/components/teams/TeamList";
import { TeamsHeader } from "@/components/teams/TeamsHeader";
import { TeamsFilters } from "@/components/teams/TeamsFilters";
import { TeamsDivisionSection } from "@/components/teams/TeamsDivisionSection";
import { useTeams } from "@/hooks/useTeams";
import { useDivisions } from "@/hooks/useDivisions";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const Teams: React.FC = () => {
  const { teams, isLoading, fetchTeams, createTeam, updateTeam, deleteTeam } = useTeams();
  const { divisions } = useDivisions();
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Track expanded divisions
  const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({});

  // Group teams by division
  const teamsByDivision = React.useMemo(() => {
    const grouped: Record<string, Team[]> = {
      unassigned: []
    };
    
    // Initialize with all division IDs
    divisions.forEach(division => {
      grouped[division.id] = [];
    });
    
    // Group teams
    teams.forEach(team => {
      if (!team.division) {
        grouped.unassigned.push(team);
      } else {
        if (!grouped[team.division]) {
          grouped[team.division] = [];
        }
        grouped[team.division].push(team);
      }
    });
    
    return grouped;
  }, [teams, divisions]);

  // Filter teams based on selection
  const filteredTeams = React.useMemo(() => {
    if (selectedDivision === "all") {
      return teams;
    }
    
    if (selectedDivision === "unassigned") {
      return teams.filter(team => !team.division);
    }
    
    return teams.filter(team => team.division === selectedDivision);
  }, [teams, selectedDivision]);

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

  // Get division name by ID
  const getDivisionName = (divisionId: string | undefined): string => {
    if (!divisionId) return "Unassigned Division";
    const division = divisions.find(d => d.id === divisionId);
    return division ? division.name : "Unknown Division";
  };

  // Toggle division expansion
  const toggleDivision = (divisionId: string) => {
    setExpandedDivisions(prev => ({
      ...prev,
      [divisionId]: !prev[divisionId]
    }));
  };

  // Initialize expanded divisions on load
  React.useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    // Default: expand all divisions on desktop, collapse on mobile
    Object.keys(teamsByDivision).forEach(divId => {
      initialExpanded[divId] = !isMobile;
    });
    setExpandedDivisions(initialExpanded);
  }, [isMobile, divisions, teamsByDivision]);

  return (
    <div className="container px-4 py-6 sm:py-8 mx-auto">
      <TeamsHeader 
        onAddTeam={() => setIsFormOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <TeamsFilters 
          selectedDivision={selectedDivision}
          onDivisionChange={setSelectedDivision}
          divisions={divisions}
        />
      </div>

      {(isFormOpen || teamToEdit) && (
        <div className="mb-6 p-4 sm:p-6 bg-card border rounded-lg shadow overflow-x-hidden">
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

      {selectedDivision === "all" ? (
        // Group display by divisions with collapsible sections
        <div className="space-y-6 sm:space-y-8">
          {Object.keys(teamsByDivision).map(divisionId => {
            const divisionTeams = teamsByDivision[divisionId];
            const divisionName = getDivisionName(divisionId === "unassigned" ? undefined : divisionId);
            const isExpanded = expandedDivisions[divisionId] !== false;
            
            return (
              <TeamsDivisionSection
                key={divisionId}
                divisionName={divisionName}
                teams={divisionTeams}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleDivision(divisionId)}
                onEditTeam={(team) => setTeamToEdit(team)}
                onDeleteTeam={(teamId) => setDeleteTeamId(teamId)}
                isLoading={isLoading}
              />
            );
          })}
        </div>
      ) : (
        // Show filtered teams
        <TeamList 
          teams={filteredTeams}
          isLoading={isLoading}
          onEdit={(team) => setTeamToEdit(team)}
          onDelete={(teamId) => setDeleteTeamId(teamId)}
        />
      )}

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


import React, { useState, useEffect, useMemo } from 'react';
import { Team } from "@/types";
import { TeamDeleteDialog } from "@/components/teams/TeamDeleteDialog";
import { TeamList } from "@/components/teams/TeamList";
import { TeamsHeader } from "@/components/teams/TeamsHeader";
import { TeamsFilters } from "@/components/teams/TeamsFilters";
import { TeamsByDivision } from "@/components/teams/TeamsByDivision";
import { TeamEditForm } from "@/components/teams/TeamEditForm";
import { useTeamManagement } from "@/hooks/useTeamManagement";
import { useDivisions } from "@/hooks/useDivisions";
import { useIsMobile } from "@/hooks/use-mobile";

const Teams: React.FC = () => {
  const { 
    teams, 
    isLoading, 
    teamToEdit, 
    setTeamToEdit,
    deleteTeamId, 
    setDeleteTeamId, 
    isRefreshing,
    isDeleting,
    handleUpdateTeam,
    handleDeleteTeam,
    handleRefresh
  } = useTeamManagement();
  
  const { divisions } = useDivisions();
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const isMobile = useIsMobile();
  
  // Deduplicate teams array first
  const uniqueTeams = useMemo(() => {
    const uniqueTeamMap = new Map<string, Team>();
    teams.forEach(team => {
      if (!uniqueTeamMap.has(team.id)) {
        uniqueTeamMap.set(team.id, team);
      }
    });
    return Array.from(uniqueTeamMap.values());
  }, [teams]);
  
  console.log(`Teams page: ${teams.length} total teams, ${uniqueTeams.length} unique teams`);
  
  // Group teams by division
  const teamsByDivision = useMemo(() => {
    const grouped: Record<string, Team[]> = {
      unassigned: []
    };
    
    // Initialize with all division IDs
    divisions.forEach(division => {
      grouped[division.id] = [];
    });
    
    // Group teams
    uniqueTeams.forEach(team => {
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
  }, [uniqueTeams, divisions]);

  // Filter teams based on selection
  const filteredTeams = useMemo(() => {
    if (selectedDivision === "all") {
      return uniqueTeams;
    }
    
    if (selectedDivision === "unassigned") {
      return uniqueTeams.filter(team => !team.division);
    }
    
    return uniqueTeams.filter(team => team.division === selectedDivision);
  }, [uniqueTeams, selectedDivision]);

  // Get division name by ID
  const getDivisionName = (divisionId: string | undefined): string => {
    if (!divisionId) return "Unassigned Division";
    const division = divisions.find(d => d.id === divisionId);
    return division ? division.name : "Unknown Division";
  };

  // Initialize expandedDivision on component mount
  useEffect(() => {
    if (!isMobile) {
      const firstNonEmptyDivision = Object.entries(teamsByDivision)
        .find(([_, teams]) => teams.length > 0);
      
      if (firstNonEmptyDivision) {
        // This will be handled by TeamsByDivision component now
        // We don't need to set it here
      }
    }
  }, [isMobile, teamsByDivision]);

  return (
    <div className="container px-4 py-6 sm:py-8 mx-auto">
      <TeamsHeader 
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

      {teamToEdit && (
        <TeamEditForm
          team={teamToEdit}
          onSubmit={handleUpdateTeam}
          onCancel={() => setTeamToEdit(null)}
        />
      )}

      {selectedDivision === "all" ? (
        <TeamsByDivision
          teamsByDivision={teamsByDivision}
          getDivisionName={getDivisionName}
          onEditTeam={setTeamToEdit}
          onDeleteTeam={setDeleteTeamId}
          isLoading={isLoading}
        />
      ) : (
        <TeamList 
          teams={filteredTeams}
          isLoading={isLoading}
          onEdit={setTeamToEdit}
          onDelete={setDeleteTeamId}
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


import React, { useState } from 'react';
import { Team } from "@/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCw, Filter, ChevronDown, ChevronUp } from "lucide-react";
import TeamForm from "@/components/teams/TeamForm";
import { TeamList } from "@/components/teams/TeamList";
import { TeamDeleteDialog } from "@/components/teams/TeamDeleteDialog";
import { useTeams } from "@/hooks/useTeams";
import { useDivisions } from "@/hooks/useDivisions";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  }, [isMobile, divisions]);

  return (
    <div className="container px-4 py-6 sm:py-8 mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Teams</h1>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedDivision} onValueChange={setSelectedDivision}>
            <SelectTrigger className="w-[180px] flex items-center gap-2">
              <Filter size={16} />
              <SelectValue placeholder="Filter by Division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              <SelectItem value="unassigned">Unassigned Division</SelectItem>
              {divisions.map(division => (
                <SelectItem key={division.id} value={division.id}>
                  {division.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleRefresh} 
            variant="outline"
            disabled={isRefreshing}
            className="flex items-center gap-2"
            size={isMobile ? "sm" : "default"}
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} /> 
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button 
            onClick={() => setIsFormOpen(true)} 
            className="flex items-center gap-2"
            size={isMobile ? "sm" : "default"}
          >
            <Plus size={16} /> Add Team
          </Button>
        </div>
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
            if (divisionTeams.length === 0) return null;
            const divisionName = getDivisionName(divisionId === "unassigned" ? undefined : divisionId);
            const isExpanded = expandedDivisions[divisionId] !== false;
            
            return (
              <div key={divisionId} className="space-y-4 border-b pb-4 last:border-b-0">
                <div 
                  className="flex justify-between items-center cursor-pointer" 
                  onClick={() => toggleDivision(divisionId)}
                >
                  <h2 className="text-xl sm:text-2xl font-semibold">
                    {divisionName} <span className="text-muted-foreground font-normal">({divisionTeams.length})</span>
                  </h2>
                  <Button variant="ghost" size="sm" className="p-1">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </Button>
                </div>
                
                {isExpanded && (
                  <TeamList 
                    teams={divisionTeams}
                    isLoading={isLoading}
                    onEdit={(team) => setTeamToEdit(team)}
                    onDelete={(teamId) => setDeleteTeamId(teamId)}
                  />
                )}
              </div>
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

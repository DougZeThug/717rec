
import React, { useState } from 'react';
import { Team } from "@/types";
import { TeamsDivisionSection } from "@/components/teams/TeamsDivisionSection";
import { Button } from "@/components/ui/button";
import { ChevronsDown, ChevronsUp } from "lucide-react";

interface TeamsByDivisionProps {
  teamsByDivision: Record<string, Team[]>;
  getDivisionName: (divisionId: string | undefined) => string;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  isLoading: boolean;
  viewMode: 'grid' | 'list';
}

export const TeamsByDivision: React.FC<TeamsByDivisionProps> = ({ 
  teamsByDivision, 
  getDivisionName,
  onEditTeam,
  onDeleteTeam,
  isLoading,
  viewMode
}) => {
  // Track expanded division (only one can be expanded at a time)
  const [expandedDivision, setExpandedDivision] = useState<string | null>(null);
  
  // Toggle division expansion - ensure only one is expanded at a time
  const toggleDivision = (divisionId: string) => {
    setExpandedDivision(prevExpanded => 
      prevExpanded === divisionId ? null : divisionId
    );
  };

  // Expand all divisions
  const expandAll = () => {
    // Find the first division with teams
    const firstDivisionWithTeams = Object.keys(teamsByDivision).find(
      divId => teamsByDivision[divId].length > 0
    );
    setExpandedDivision(firstDivisionWithTeams || null);
  };

  // Collapse all divisions
  const collapseAll = () => {
    setExpandedDivision(null);
  };
  
  // Filter out empty divisions
  const nonEmptyDivisions = Object.keys(teamsByDivision)
    .filter(divId => teamsByDivision[divId].length > 0);

  if (nonEmptyDivisions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No teams available in any division.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex justify-end gap-2 mb-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1 h-8"
          onClick={expandAll}
        >
          <ChevronsDown size={16} />
          <span className="hidden sm:inline">Expand All</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1 h-8"
          onClick={collapseAll}
        >
          <ChevronsUp size={16} />
          <span className="hidden sm:inline">Collapse All</span>
        </Button>
      </div>

      {nonEmptyDivisions.map(divisionId => {
        const divisionTeams = teamsByDivision[divisionId];
        const divisionName = getDivisionName(divisionId === "unassigned" ? undefined : divisionId);
        const isExpanded = expandedDivision === divisionId;
        
        return (
          <TeamsDivisionSection
            key={divisionId}
            divisionName={divisionName}
            divisionId={divisionId}
            teams={divisionTeams}
            isExpanded={isExpanded}
            onToggleExpand={() => toggleDivision(divisionId)}
            onEditTeam={onEditTeam}
            onDeleteTeam={onDeleteTeam}
            isLoading={isLoading}
            viewMode={viewMode}
          />
        );
      })}
    </div>
  );
};

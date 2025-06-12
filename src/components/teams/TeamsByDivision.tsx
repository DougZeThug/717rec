
import React, { useMemo } from 'react';
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
  sortMode: 'rank' | 'alpha'; // New prop
}

export const TeamsByDivision: React.FC<TeamsByDivisionProps> = ({ 
  teamsByDivision, 
  getDivisionName,
  onEditTeam,
  onDeleteTeam,
  isLoading,
  viewMode,
  sortMode
}) => {
  const [expandedDivision, setExpandedDivision] = React.useState<string | null>(null);
  const toggleDivision = (divisionId: string) => {
    setExpandedDivision(prevExpanded => 
      prevExpanded === divisionId ? null : divisionId
    );
  };

  const expandAll = () => {
    const firstDivisionWithTeams = Object.keys(teamsByDivision).find(
      divId => teamsByDivision[divId].length > 0
    );
    setExpandedDivision(firstDivisionWithTeams || null);
  };

  const collapseAll = () => {
    setExpandedDivision(null);
  };

  // Filter out empty divisions
  const nonEmptyDivisions = Object.keys(teamsByDivision)
    .filter(divId => teamsByDivision[divId].length > 0);

  // Re-sort teams in each division appropriately
  const sortedTeamsByDivision = useMemo(() => {
    const sorted: Record<string, Team[]> = {};
    for (const divId of Object.keys(teamsByDivision)) {
      const divisionTeams = teamsByDivision[divId] || [];
      
      if (sortMode === "alpha") {
        // Sort alphabetically by team name
        sorted[divId] = [...divisionTeams].sort((a, b) => 
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
      } else {
        // Sort by power_score (descending)
        sorted[divId] = [...divisionTeams].sort((a, b) => 
          (b.power_score ?? 0) - (a.power_score ?? 0)
        );
      }
    }
    return sorted;
  }, [teamsByDivision, sortMode]);

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
        const divisionTeams = sortedTeamsByDivision[divisionId];
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

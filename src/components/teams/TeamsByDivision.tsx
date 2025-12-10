import React, { useMemo } from 'react';
import { Team } from "@/types";
import { TeamsDivisionSection } from "@/components/teams/TeamsDivisionSection";

interface TeamsByDivisionProps {
  teamsByDivision: Record<string, Team[]>;
  getDivisionName: (displayDivision: string | undefined) => string;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  isLoading: boolean;
  viewMode: 'grid' | 'list';
  sortMode: 'rank' | 'alpha';
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
  
  // Auto-expand first division on mount
  React.useEffect(() => {
    const firstDivision = Object.keys(teamsByDivision).find(
      d => teamsByDivision[d].length > 0
    );
    if (firstDivision && expandedDivision === null) {
      setExpandedDivision(firstDivision);
    }
  }, [teamsByDivision]);

  const toggleDivision = (displayDivision: string) => {
    setExpandedDivision(prevExpanded => 
      prevExpanded === displayDivision ? null : displayDivision
    );
  };

  // Filter out empty divisions
  const nonEmptyDivisions = Object.keys(teamsByDivision)
    .filter(displayDivision => teamsByDivision[displayDivision].length > 0);

  // Re-sort teams in each division appropriately
  const sortedTeamsByDivision = useMemo(() => {
    const sorted: Record<string, Team[]> = {};
    for (const displayDivision of Object.keys(teamsByDivision)) {
      const divisionTeams = teamsByDivision[displayDivision] || [];
      
      if (sortMode === "alpha") {
        sorted[displayDivision] = [...divisionTeams].sort((a, b) => 
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
      } else {
        sorted[displayDivision] = [...divisionTeams].sort((a, b) => 
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
    <div className="space-y-3 sm:space-y-6">
      {nonEmptyDivisions.map(displayDivision => {
        const divisionTeams = sortedTeamsByDivision[displayDivision];
        const divisionName = getDivisionName(displayDivision);
        const isExpanded = expandedDivision === displayDivision;
        
        return (
          <TeamsDivisionSection
            key={displayDivision}
            divisionName={divisionName}
            divisionId={displayDivision}
            teams={divisionTeams}
            isExpanded={isExpanded}
            onToggleExpand={() => toggleDivision(displayDivision)}
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

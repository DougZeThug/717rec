
import React, { useState } from 'react';
import { Team } from "@/types";
import { TeamsDivisionSection } from "@/components/teams/TeamsDivisionSection";

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
  
  return (
    <div className="space-y-6 sm:space-y-8">
      {Object.keys(teamsByDivision).map(divisionId => {
        const divisionTeams = teamsByDivision[divisionId];
        const divisionName = getDivisionName(divisionId === "unassigned" ? undefined : divisionId);
        const isExpanded = expandedDivision === divisionId;
        
        if (divisionTeams.length === 0) return null;
        
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


import React, { useMemo } from 'react';
import { Team } from "@/types";
import TeamCard from "@/components/teams/TeamCard";
import { TeamListSkeleton } from "@/components/teams/TeamListSkeleton";
import { useIsMobile } from "@/hooks/use-mobile";

interface TeamListProps {
  teams: Team[];
  isLoading: boolean;
  onEdit: (team: Team) => void;
  onDelete: (teamId: string) => void;
  viewMode: 'grid' | 'list';
}

export const TeamList: React.FC<TeamListProps> = ({ teams, isLoading, onEdit, onDelete, viewMode }) => {
  const isMobile = useIsMobile();
  
  // Create a deduplicated array of teams by team ID
  const uniqueTeams = useMemo(() => {
    const uniqueTeamMap = new Map<string, Team>();
    
    teams.forEach(team => {
      if (!uniqueTeamMap.has(team.id)) {
        uniqueTeamMap.set(team.id, team);
      }
    });
    
    return Array.from(uniqueTeamMap.values());
  }, [teams]);
  
  if (isLoading) {
    return <TeamListSkeleton viewMode={viewMode} />;
  }

  if (uniqueTeams.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No teams available. Add a team to get started.</p>
      </div>
    );
  }

  // Enhanced grid classes with better mobile responsiveness
  const gridClasses = viewMode === 'grid'
    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3"
    : "space-y-4";

  return (
    <div className={gridClasses}>
      {uniqueTeams.map(team => (
        <TeamCard 
          key={team.id} 
          team={team}
          onDelete={(teamId) => onDelete(teamId)}
          onEdit={(team) => onEdit(team)}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
};

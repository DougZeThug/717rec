
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
}

export const TeamList: React.FC<TeamListProps> = ({ teams, isLoading, onEdit, onDelete }) => {
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
    return <TeamListSkeleton />;
  }

  // Debug unique team data
  console.log("TeamList rendering unique teams:", uniqueTeams.length, "out of", teams.length, "total teams");

  if (uniqueTeams.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No teams available. Add a team to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {uniqueTeams.map(team => (
        <TeamCard 
          key={team.id} 
          team={team}
          onDelete={(teamId) => onDelete(teamId)}
          onEdit={(team) => onEdit(team)}
        />
      ))}
    </div>
  );
};

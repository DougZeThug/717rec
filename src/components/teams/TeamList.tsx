
import React from 'react';
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
  
  if (isLoading) {
    return <TeamListSkeleton />;
  }

  // Debug team image data
  console.log("TeamList rendering teams:", teams.slice(0, 3).map(team => ({
    id: team.id,
    name: team.name,
    logoUrl: team.logoUrl,
    imageUrl: team.imageUrl
  })));

  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No teams available. Add a team to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {teams.map(team => (
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

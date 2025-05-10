
import React from "react";
import { Team } from "@/types";
import { Badge } from "@/components/ui/badge";
import TeamLogo from "@/components/ui/team/TeamLogo";

interface TimeBlockTeamsListProps {
  teams: Team[];
}

export const TimeBlockTeamsList: React.FC<TimeBlockTeamsListProps> = ({ teams }) => {
  if (teams.length === 0) {
    return (
      <p className="text-center py-2 text-sm text-muted-foreground">
        No teams assigned to this block
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {teams.map(team => (
        <div key={team.id} className="flex items-center gap-2 p-2 border rounded-md">
          <TeamLogo 
            imageUrl={team.logoUrl} 
            teamName={team.name} 
            className="h-6 w-6" 
          />
          <span className="text-sm truncate">{team.name}</span>
        </div>
      ))}
    </div>
  );
};

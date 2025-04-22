
import React from "react";
import { Team } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Trophy, X } from "lucide-react";

interface TeamHeaderProps {
  team: Team;
  winPercentage: string;
}

const TeamHeader = ({ team, winPercentage }: TeamHeaderProps) => {
  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-center mb-4 w-full">
        <img
          src={team?.imageUrl || team?.logoUrl || '/placeholder-logo.png'}
          alt={`${team?.name} logo`}
          onError={(e) => {
            console.error(`Image load error for ${team?.name}:`, team?.imageUrl);
            (e.target as HTMLImageElement).src = '/placeholder-logo.png';
          }}
          className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl object-contain shadow-md mx-auto"
        />
      </div>
      
      <div className="text-center">
        <h1 className="text-3xl font-bold">{team.name}</h1>
        
        <div className="flex flex-wrap justify-center items-center gap-2 mt-2">
          {team.divisionName && (
            <Badge variant="outline" className="font-medium">
              {team.divisionName}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamHeader;

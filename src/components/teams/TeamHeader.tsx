
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
        {/* Team Name with Bebas Neue, all caps, tracking-wide, no bold */}
        <h1 className="font-bebas uppercase tracking-wide text-3xl sm:text-4xl font-normal text-gray-900 dark:text-white">
          {team.name}
        </h1>
        <div className="flex flex-wrap justify-center items-center gap-2 mt-2">
          {team.divisionName && (
            <Badge variant="outline" className="font-inter uppercase font-medium tracking-widest text-xs sm:text-sm py-1 px-3">
              {team.divisionName}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamHeader;

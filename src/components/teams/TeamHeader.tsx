
import React from "react";
import { Team } from "@/types";
import { Badge } from "@/components/ui/badge";
import { TeamLogo } from "@/components/ui/team/TeamLogo";
import TeamBadgeCollection from "@/components/badges/TeamBadgeCollection";
import { blueAmberHeading } from "@/styles/design-system/blueAmber";
import { cn } from "@/lib/utils";

interface TeamHeaderProps {
  team: Team;
  winPercentage?: string;
}

const TeamHeader = ({ team, winPercentage }: TeamHeaderProps) => {
  return (
    <div className="flex flex-col items-center mb-2 md:mb-4">
      <div className="flex justify-center mb-2 md:mb-4 w-full">
        <TeamLogo
          imageUrl={team?.imageUrl || team?.logoUrl}
          teamName={team?.name}
          size="lg"
          rounded={false}
          className="w-16 h-16 md:w-20 md:h-20"
        />
      </div>
      <div className="text-center">
        {/* Team Name with blue-amber gradient styling */}
        <h1 className={cn(
          "font-bebas uppercase tracking-wide text-2xl sm:text-3xl md:text-4xl font-normal mb-1 md:mb-2",
          blueAmberHeading()
        )}>
          {team.name}
        </h1>
        
        {/* Division Badge */}
        <div className="flex flex-wrap justify-center items-center gap-2 mb-2 md:mb-3">
          {team.divisionName && (
            <Badge variant="outline" className="font-inter uppercase font-medium tracking-widest text-xs py-0.5 px-2 md:py-1 md:px-3">
              {team.divisionName}
            </Badge>
          )}
        </div>
        
        {/* Team Badges - Trophy Case */}
        <div className="flex justify-center">
          <TeamBadgeCollection
            teamId={team.id}
            size="md"
            maxDisplay={8}
            orientation="horizontal"
            className="gap-1.5 md:gap-2"
          />
        </div>
      </div>
    </div>
  );
};

export default TeamHeader;

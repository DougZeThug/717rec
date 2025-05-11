
import React from "react";
import { Team } from "@/types";
import { Badge } from "@/components/ui/badge";
import { TeamLogo } from "@/components/ui/team/TeamLogo";
import { blueAmberHeading } from "@/styles/design-system/blueAmber";
import { cn } from "@/lib/utils";

interface TeamHeaderProps {
  team: Team;
  winPercentage?: string;
}

const TeamHeader = ({ team, winPercentage }: TeamHeaderProps) => {
  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-center mb-4 w-full">
        <TeamLogo
          imageUrl={team?.imageUrl || team?.logoUrl}
          teamName={team?.name}
          size="lg"
          rounded={false}
        />
      </div>
      <div className="text-center">
        {/* Team Name with blue-amber gradient styling */}
        <h1 className={cn(
          "font-bebas uppercase tracking-wide text-3xl sm:text-4xl font-normal",
          blueAmberHeading()
        )}>
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

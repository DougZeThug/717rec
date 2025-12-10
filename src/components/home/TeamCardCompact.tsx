import React from "react";
import { Team } from "@/types";
import { Link } from "react-router-dom";
import { TeamLogo } from "./TeamLogo";
import { cn } from "@/lib/utils";
import { blueAmberHeading } from "@/styles/design-system/blueAmber";

interface TeamCardCompactProps {
  team: Team;
  rank: number;
}

const TeamCardCompact: React.FC<TeamCardCompactProps> = ({ team, rank }) => {
  return (
    <Link 
      to={`/teams/${team.id}`} 
      className={cn(
        "relative flex flex-col items-center p-3 rounded-lg",
        "bg-gradient-to-br from-white via-white to-gray-50",
        "dark:from-[#1E1E1E] dark:via-gray-800/90 dark:to-gray-900",
        "border border-border/50",
        "shadow-sm hover:shadow-md transition-shadow",
        "min-w-[120px] max-w-[140px]"
      )}
    >
      {/* Rank badge */}
      <div className="absolute -top-2 -left-1 bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
        #{rank}
      </div>
      
      {/* Logo */}
      <div className="w-14 h-14 relative flex items-center justify-center mb-2 [&_img]:max-h-12 [&_img]:max-w-12">
        <TeamLogo imageUrl={team.imageUrl} teamName={team.name} />
      </div>
      
      {/* Team name */}
      <h3 className={cn(
        "font-bebas text-sm uppercase tracking-wide text-center truncate w-full",
        blueAmberHeading()
      )}>
        {team.name}
      </h3>
      
      {/* Record */}
      <div className="text-xs text-muted-foreground mt-1">
        {team.wins}-{team.losses}
      </div>
    </Link>
  );
};

export default TeamCardCompact;

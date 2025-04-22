
import React from "react";
import { Team } from "@/types";
import { Link } from "react-router-dom";
import { getCardInteractionStyles } from "@/styles/interactionUtils";
import { useTheme } from "next-themes";
import { TeamLogo } from "./TeamLogo";
import { TeamStats } from "./TeamStats";

interface TeamCardProps {
  team: Team;
}

const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className="overflow-hidden mb-4 sm:mb-0 transition duration-200 hover:shadow-md">
      <Link to={`/teams/${team.id}`} className="block">
        <div className="h-40 bg-gray-100 dark:bg-gray-800/50 relative flex items-center justify-center p-3">
          <TeamLogo imageUrl={team.imageUrl} teamName={team.name} />
        </div>
        <div className="p-4">
          <h3 className="font-bebas font-normal uppercase tracking-wide text-xl text-gray-800 dark:text-white mb-2 truncate">
            {team.name}
          </h3>
          <TeamStats team={team} />
        </div>
      </Link>
    </div>
  );
};

export default TeamCard;

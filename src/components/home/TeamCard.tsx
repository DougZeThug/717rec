
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
  
  console.debug('[HomeTeamCard]', team.id, 'imageUrl:', team.imageUrl);
  
  return (
    <div className={getCardInteractionStyles("bg-white rounded-lg shadow-md overflow-hidden mb-4 sm:mb-0 text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#1E1E1E] dark:text-white dark:border-none")}>
      <Link to={`/teams/${team.id}`} className="block">
        <div className="h-44 bg-gray-200 relative flex items-center justify-center p-3">
          <TeamLogo imageUrl={team.imageUrl} teamName={team.name} />
        </div>
        <TeamStats team={team} />
      </Link>
    </div>
  );
};

export default TeamCard;

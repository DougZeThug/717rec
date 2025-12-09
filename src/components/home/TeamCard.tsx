
import React from "react";
import { Team } from "@/types";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { TeamLogo } from "./TeamLogo";
import { TeamStats } from "./TeamStats";
import TeamBadgeCollection from "@/components/badges/TeamBadgeCollection";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";
import { blueAmber, blueAmberHeading } from "@/styles/design-system/blueAmber";
import { motion } from "framer-motion";

interface TeamCardProps {
  team: Team;
  delay?: number;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, delay = 0 }) => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  
  // Calculate animation delay class based on prop
  const delayClass = delay ? `animation-delay-${delay * 100}` : '';

  return (
    <motion.div 
      className={cn(
        "overflow-hidden rounded-xl shadow-md",
        "border border-border/50",
        "bg-gradient-to-br from-white via-white to-gray-50",
        "dark:from-[#1E1E1E] dark:via-gray-800/90 dark:to-gray-900",
        "border-t-[3px] border-t-blue-500 dark:border-t-blue-400",
        animations.fadeInSlideUp,
        delayClass
      )}
      whileHover={{ scale: 1.03, y: -4, boxShadow: "0 12px 24px -8px rgba(0,0,0,0.15)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Link to={`/teams/${team.id}`} className="block">
        <div className="h-44 relative flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-800/80 dark:via-gray-800/50 dark:to-gray-900/60">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-amber-50/20 dark:from-blue-900/10 dark:to-amber-900/10"></div>
          <TeamLogo imageUrl={team.imageUrl} teamName={team.name} />
          
          {/* Badges positioned in top-right corner */}
          <div className="absolute top-2 right-2">
            <TeamBadgeCollection 
              teamId={team.id} 
              size="sm" 
              maxDisplay={3}
              orientation="vertical"
            />
          </div>
        </div>
        <div className="border-t border-border/30 dark:border-border/20" />
        <div className="p-4 bg-gradient-to-br from-white to-gray-50/70 dark:from-[#1E1E1E] dark:to-gray-900/90">
          <h3 className={cn(
            "font-bebas font-normal uppercase tracking-wide text-xl mb-2 truncate",
            blueAmberHeading()
          )}>
            {team.name}
          </h3>
          <TeamStats team={team} />
        </div>
      </Link>
    </motion.div>
  );
};

export default TeamCard;

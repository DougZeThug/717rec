
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Team } from "@/types";
import TeamCard from "./TeamCard";
import { cn } from "@/lib/utils";
import { gradients, animations } from "@/styles/design-system";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy } from "lucide-react";

interface TopTeamsProps {
  teams: Team[];
}

const TopTeams: React.FC<TopTeamsProps> = ({ teams }) => {
  if (teams.length === 0) {
    return (
      <section id="top-teams-section" className={cn(
        "py-6 md:py-8 rounded-xl shadow-sm mb-4",
        "bg-gradient-to-br from-blue-50/50 via-gray-50 to-orange-50/30",
        "dark:from-gray-900 dark:via-gray-900/90 dark:to-gray-900/80",
        animations.fadeIn
      )}>
        <EmptyState
          icon={Trophy}
          title="No Teams Ranked Yet"
          description="Teams will appear here once the season starts and matches are played."
          actions={[
            {
              label: "View All Teams",
              onClick: () => window.location.href = "/teams",
              variant: "default"
            }
          ]}
        />
      </section>
    );
  }

  return (
    <section id="top-teams-section" className={cn(
      "py-6 md:py-8 rounded-xl shadow-sm mb-4",
      "bg-gradient-to-br from-blue-50/50 via-gray-50 to-orange-50/30",
      "dark:from-gray-900 dark:via-gray-900/90 dark:to-gray-900/80",
      animations.fadeIn
    )}>
      <div className="flex flex-wrap justify-between items-center px-3 md:px-0 mb-4">
        <div>
          <h2 className={cn(
            "text-2xl md:text-3xl font-bold text-cornhole-navy dark:text-white font-sans",
            "bg-gradient-to-r from-cornhole-navy to-blue-600/90 dark:from-blue-400 dark:to-blue-500/90",
            "bg-clip-text text-transparent"
          )}>
            Top Teams
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-sans">Based on highest power score ranking</p>
        </div>
        <Button 
          asChild 
          variant="blueOrange"
          className="shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
        >
          <Link to="/teams">View All</Link>
        </Button>
      </div>
      <div className="flex flex-col space-y-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 sm:space-y-0 px-3 md:px-0">
        {teams.map((team, index) => (
          <div 
            key={team.id} 
            className={cn(
              "rounded-xl shadow-sm border border-gray-200 dark:border-gray-700",
              "bg-gradient-to-br from-white via-white to-gray-50 dark:from-[#1E1E1E] dark:via-gray-800/90 dark:to-gray-900",
              "hover:bg-gradient-to-br hover:from-white hover:via-blue-50/10 hover:to-orange-50/20",
              "dark:hover:from-gray-800/90 dark:hover:via-gray-800/80 dark:hover:to-gray-900",
              "transition-all duration-300",
              animations.fadeInSlideUp,
              // Stagger the animation delay
              index === 0 ? "" : 
              index === 1 ? animations.delay.short :
              index === 2 ? animations.delay.medium : 
              animations.delay.long
            )}
          >
            <TeamCard team={team} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default TopTeams;

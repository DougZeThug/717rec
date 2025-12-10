import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Team } from "@/types";
import TeamCard from "./TeamCard";
import TeamCardCompact from "./TeamCardCompact";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface TopTeamsProps {
  teams: Team[];
}

const TopTeams: React.FC<TopTeamsProps> = ({ teams }) => {
  // Take top 10 teams
  const topTenTeams = teams.slice(0, 10);

  if (topTenTeams.length === 0) {
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
      "py-6 md:py-8 px-4 md:px-6 rounded-xl shadow-sm mb-4 mt-4",
      "bg-gradient-to-br from-blue-50/50 via-gray-50 to-orange-50/30",
      "dark:from-gray-900 dark:via-gray-900/90 dark:to-gray-900/80",
      animations.fadeIn
    )}>
      <div className="flex flex-wrap justify-between items-center mb-4 md:mb-6">
        <div>
          <h2 className={cn(
            "text-2xl md:text-3xl font-bebas uppercase tracking-wide",
            "bg-gradient-to-r from-blue-800 via-blue-700 to-amber-700",
            "dark:from-blue-400 dark:to-amber-400",
            "bg-clip-text text-transparent"
          )}>
            Top 10 Teams
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Based on highest power score ranking</p>
        </div>
        <Button 
          asChild 
          variant="blueOrange"
          className="shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
        >
          <Link to="/teams">View All</Link>
        </Button>
      </div>

      {/* Mobile: Horizontal Carousel */}
      <div className="block md:hidden">
        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {topTenTeams.map((team, index) => (
              <CarouselItem key={team.id} className="pl-2 basis-[140px]">
                <div className="relative pt-4 pb-1">
                  <TeamCardCompact team={team} rank={index + 1} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Swipe to see more →
        </p>
      </div>

      {/* Desktop: Grid Layout (show top 4) */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {topTenTeams.slice(0, 4).map((team, index) => (
          <TeamCard 
            key={team.id} 
            team={team} 
            delay={index * 0.1}
          />
        ))}
      </div>
    </section>
  );
};

export default TopTeams;

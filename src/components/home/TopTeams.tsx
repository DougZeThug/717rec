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
import { SectionHeader } from "@/components/ui/CollapsibleSection";
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface TopTeamsProps {
  teams: Team[];
}

const TopTeams: React.FC<TopTeamsProps> = ({ teams }) => {
  const { shouldApplyWinter } = useSeasonalTheme();
  const topTenTeams = teams.slice(0, 10);

  const sectionClasses = cn(
    "py-6 md:py-8 px-4 md:px-6 rounded-xl shadow-sm mb-4 mt-4",
    shouldApplyWinter
      ? "frost-card frost-edge winter-card-surface"
      : cn(
          "bg-gradient-to-br from-blue-50/50 via-gray-50 to-orange-50/30",
          "dark:from-gray-900 dark:via-gray-900/90 dark:to-gray-900/80"
        ),
    animations.fadeIn
  );

  if (topTenTeams.length === 0) {
    return (
      <section id="top-teams-section" className={sectionClasses}>
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
    <section id="top-teams-section" className={sectionClasses}>
      <SectionHeader
        title="Top 10 Teams"
        icon={Trophy}
        iconColor={shouldApplyWinter ? "text-cyan-400" : "text-amber-500"}
        description="Based on highest power score ranking"
        action={
          <Button 
            asChild 
            variant="blueOrange"
            className={cn(
              "shadow-md hover:shadow-lg transition-all duration-200 font-semibold",
              shouldApplyWinter && "btn-winter-primary"
            )}
          >
            <Link to="/teams">View All</Link>
          </Button>
        }
      />

      {/* Mobile: Horizontal Carousel */}
      <div className="block md:hidden">
        <Carousel
          opts={{
            align: "start",
            loop: false,
            dragFree: true,
            skipSnaps: true,
            duration: 20,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {topTenTeams.map((team, index) => (
              <CarouselItem key={team.id} className="pl-2 basis-[140px]">
                <div className="pt-5 pb-1">
                  <TeamCardCompact team={team} rank={index + 1} isWinter={shouldApplyWinter} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <p className={cn(
          "text-xs text-center mt-3",
          shouldApplyWinter ? "text-cyan-300/60" : "text-muted-foreground"
        )}>
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
            isWinter={shouldApplyWinter}
          />
        ))}
      </div>
    </section>
  );
};

export default TopTeams;

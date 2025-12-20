import React, { lazy, Suspense } from "react";
import { useTeams } from "@/hooks/useTeams";
import { usePendingScoresMatches } from "@/hooks/usePendingScoresMatches";
import { useHeroCards } from "@/hooks/useHeroCards";
import { useWeeklyPowerScoreTrends } from "@/hooks/useWeeklyPowerScoreTrends";
import TopTeams from "@/components/home/TopTeams";
import HeroSection from "@/components/home/HeroSection";
import PendingScoresCard from "@/components/home/PendingScoresCard";
import TeamOfTheWeekCard from "@/components/home/TeamOfTheWeekCard";
import TeamOfTheWeekSkeleton from "@/components/home/TeamOfTheWeekSkeleton";
import HeroCard from "@/components/hero/HeroCard";
import HeroCardSkeleton from "@/components/hero/HeroCardSkeleton";
import PageLayout from "@/components/layout/PageLayout";

import { useIsMobile } from "@/hooks/use-mobile";
import PageTransition from "@/components/transitions/PageTransition";

// Lazy load CallToAction since it's below the fold
const CallToAction = lazy(() => import("@/components/home/CallToAction"));

const Index: React.FC = () => {
  const { teams, isLoading: teamsLoading } = useTeams();
  const { matches: pendingMatches, isLoading: pendingScoresLoading } = usePendingScoresMatches();
  const { data: heroCards, isLoading: heroCardsLoading } = useHeroCards();
  const { data: trendData, isLoading: trendLoading } = useWeeklyPowerScoreTrends('up', 1);
  const isMobile = useIsMobile();
  
  const hasPendingScores = !pendingScoresLoading && pendingMatches.length > 0;
  const topGainer = trendData?.trends?.[0];
  const hasTeamOfWeek = !trendLoading && topGainer && topGainer.delta > 0;
  
  // Top teams by power score
  const topTeams = React.useMemo(() => {
    if (!teams?.length) return [];
    return [...teams]
      .sort((a, b) => (b.power_score ?? 0) - (a.power_score ?? 0))
      .slice(0, 10);
  }, [teams]);
  
  const getDelay = (index: number) => {
    if (index === 0) return 'short' as const;
    if (index === 1) return 'medium' as const;
    return 'long' as const;
  };
  
  return (
    <PageLayout 
      className="flex flex-col gap-4 md:gap-8" 
      compact={isMobile}
      gradientVariant="blueOrange"
    >
      <PageTransition animation="fadeInSlideDown" immediate>
        <HeroSection />
      </PageTransition>
      
      <div className="container mx-auto px-4 flex flex-col gap-4 md:gap-8">
        {/* Dynamic hero cards from database */}
        {heroCardsLoading ? (
          <HeroCardSkeleton />
        ) : (
          heroCards?.map((card, index) => (
            <PageTransition 
              key={card.id} 
              animation="fadeInSlideUp" 
              delay={getDelay(index)}
            >
              <HeroCard card={card} />
            </PageTransition>
          ))
        )}

        {/* Team of the Week */}
        {trendLoading ? (
          <TeamOfTheWeekSkeleton />
        ) : hasTeamOfWeek && trendData?.latestWeek ? (
          <PageTransition animation="fadeInSlideUp" delay="medium">
            <TeamOfTheWeekCard trend={topGainer} weekNumber={trendData.latestWeek} />
          </PageTransition>
        ) : null}

        {hasPendingScores && (
          <PageTransition animation="fadeInSlideUp" delay="long">
            <PendingScoresCard />
          </PageTransition>
        )}

        {teamsLoading ? (
          <div className="h-48 animate-pulse bg-muted/30 rounded-lg" />
        ) : (
          <PageTransition animation="fadeInSlideUp" delay="long">
            <TopTeams teams={topTeams} />
          </PageTransition>
        )}

        <PageTransition animation="fadeIn" delay="long">
          <Suspense fallback={<div className="h-32" />}>
            <CallToAction />
          </Suspense>
        </PageTransition>
      </div>
    </PageLayout>
  );
};

export default Index;

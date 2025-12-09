import React from "react";
import { useTeams } from "@/hooks/useTeams";
import { usePendingScoresMatches } from "@/hooks/usePendingScoresMatches";
import { useHeroCards } from "@/hooks/useHeroCards";
import TopTeams from "@/components/home/TopTeams";
import CallToAction from "@/components/home/CallToAction";
import HeroSection from "@/components/home/HeroSection";
import PendingScoresCard from "@/components/home/PendingScoresCard";
import HeroCard from "@/components/hero/HeroCard";
import HeroCardSkeleton from "@/components/hero/HeroCardSkeleton";
import PageLayout from "@/components/layout/PageLayout";
import LoadingState from "@/components/ui/loading-state";
import { useIsMobile } from "@/hooks/use-mobile";
import PageTransition from "@/components/transitions/PageTransition";

const Index: React.FC = () => {
  const { teams, isLoading: teamsLoading } = useTeams();
  const { matches: pendingMatches, isLoading: pendingScoresLoading } = usePendingScoresMatches();
  const { data: heroCards, isLoading: heroCardsLoading } = useHeroCards();
  const isMobile = useIsMobile();
  
  const isLoading = teamsLoading;
  const hasPendingScores = !pendingScoresLoading && pendingMatches.length > 0;
  
  // Top teams by power score
  const topTeams = React.useMemo(() => {
    if (!teams?.length) return [];
    return [...teams]
      .sort((a, b) => (b.power_score ?? 0) - (a.power_score ?? 0))
      .slice(0, 4);
  }, [teams]);
  
  if (isLoading) {
    return <LoadingState fullscreen message="Loading league data..." size="lg" />;
  }
  
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
      <PageTransition animation="fadeInSlideDown">
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

        {hasPendingScores && (
          <PageTransition animation="fadeInSlideUp" delay="long">
            <PendingScoresCard />
          </PageTransition>
        )}

        <PageTransition animation="fadeInSlideUp" delay="long">
          <TopTeams teams={topTeams} />
        </PageTransition>

        <PageTransition animation="fadeIn" delay="long">
          <CallToAction />
        </PageTransition>
      </div>
    </PageLayout>
  );
};

export default Index;

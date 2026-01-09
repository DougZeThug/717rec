import React, { lazy, Suspense } from "react";
import { useTeams } from "@/hooks/useTeams";
import { usePendingScoresMatches } from "@/hooks/usePendingScoresMatches";
import { useHeroCards } from "@/hooks/useHeroCards";
import { useWeeklyPowerScoreTrends } from "@/hooks/useWeeklyPowerScoreTrends";
import { useConfirmationSeason } from "@/hooks/useSeasonParticipation";
import { useMyNextMatch } from "@/hooks/useMyNextMatch";
import TopTeams from "@/components/home/TopTeams";
import HeroSection from "@/components/home/HeroSection";
import PendingScoresCard from "@/components/home/PendingScoresCard";
import TeamOfTheWeekCard from "@/components/home/TeamOfTheWeekCard";
import TeamOfTheWeekSkeleton from "@/components/home/TeamOfTheWeekSkeleton";
import MyNextMatchCard from "@/components/home/MyNextMatchCard";
import MyNextMatchSkeleton from "@/components/home/MyNextMatchSkeleton";
import HeroCard from "@/components/hero/HeroCard";
import HeroCardSkeleton from "@/components/hero/HeroCardSkeleton";
import ParticipationHeroCard from "@/components/hero/ParticipationHeroCard";
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
  const { data: confirmationSeason } = useConfirmationSeason();
  const myNextMatch = useMyNextMatch();
  const isMobile = useIsMobile();
  
  const hasPendingScores = !pendingScoresLoading && pendingMatches.length > 0;
  const topGainer = trendData?.trends?.[0];
  const hasTeamOfWeek = !trendLoading && topGainer && topGainer.delta > 0;
  const showParticipationCard = !!confirmationSeason;
  
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
        {/* My Next Match - shown for authenticated users with a team */}
        {myNextMatch.isLoading ? (
          <MyNextMatchSkeleton />
        ) : myNextMatch.hasTeamMembership && myNextMatch.nextMatch && myNextMatch.myTeam && myNextMatch.opponent ? (
          <PageTransition animation="fadeInSlideUp" delay="short">
            <MyNextMatchCard
              match={myNextMatch.nextMatch}
              myTeam={myNextMatch.myTeam}
              opponent={myNextMatch.opponent}
              weekNumber={myNextMatch.weekNumber}
            />
          </PageTransition>
        ) : null}

        {/* Season Participation Card - shown when confirmation is open */}
        {showParticipationCard && (
          <PageTransition animation="fadeInSlideUp" delay="short">
            <ParticipationHeroCard />
          </PageTransition>
        )}

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

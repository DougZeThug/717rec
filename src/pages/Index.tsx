import React, { lazy, Suspense, useCallback } from 'react';

import HeroCardSkeleton from '@/components/hero/HeroCardSkeleton';
import HeroSection from '@/components/home/HeroSection';
import LeagueHistoryBar from '@/components/home/LeagueHistoryBar';
import MyMatchesSection from '@/components/home/MyMatchesSection';
import MyNextMatchSkeleton from '@/components/home/MyNextMatchSkeleton';
import PendingScoresCard from '@/components/home/PendingScoresCard';
import TeamOfTheWeekCard from '@/components/home/TeamOfTheWeekCard';
import TeamOfTheWeekSkeleton from '@/components/home/TeamOfTheWeekSkeleton';
import WeeklyRecapCard from '@/components/home/WeeklyRecapCard';
import WeeklyRecapSkeleton from '@/components/home/WeeklyRecapSkeleton';
import PageLayout from '@/components/layout/PageLayout';
import PageTransition from '@/components/transitions/PageTransition';
import { useHeroCards } from '@/hooks/useHeroCards';
import { useIsMobile } from '@/hooks/useMobile';
import { useMyNextMatch } from '@/hooks/useMyNextMatch';
import { usePendingScoresMatches } from '@/hooks/usePendingScoresMatches';
import { useConfirmationSeason } from '@/hooks/useSeasonParticipation';
import { useTeams } from '@/hooks/useTeams';
import { useWeeklyPowerScoreTrends } from '@/hooks/useWeeklyPowerScoreTrends';
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap';

// Lazy load components that use framer-motion to defer vendor-motion chunk and improve TTI
const HeroCard = lazy(() => import('@/components/hero/HeroCard'));
const ParticipationHeroCard = lazy(() => import('@/components/hero/ParticipationHeroCard'));
const CallToAction = lazy(() => import('@/components/home/CallToAction'));
const TopTeams = lazy(() => import('@/components/home/TopTeams'));

const Index: React.FC = () => {
  const { teams, isLoading: teamsLoading } = useTeams();
  const { matches: pendingMatches, isLoading: pendingScoresLoading } = usePendingScoresMatches();
  const { data: heroCards, isLoading: heroCardsLoading } = useHeroCards();
  const { data: trendData, isLoading: trendLoading } = useWeeklyPowerScoreTrends('up', 3);
  const { data: fallerData } = useWeeklyPowerScoreTrends('down', 1);
  const { data: recapData, isLoading: recapLoading } = useWeeklyRecap();
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
    return [...teams].sort((a, b) => (b.power_score ?? 0) - (a.power_score ?? 0)).slice(0, 10);
  }, [teams]);

  const getDelay = useCallback((index: number) => {
    if (index === 0) return 'short' as const;
    if (index === 1) return 'medium' as const;
    return 'long' as const;
  }, []);

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
        {/* Dynamic hero cards from database - shown prominently below header */}
        {heroCardsLoading ? (
          <HeroCardSkeleton />
        ) : (
          heroCards?.map((card, index) => (
            <PageTransition key={card.id} animation="fadeIn" delay={getDelay(index)}>
              <Suspense fallback={<HeroCardSkeleton />}>
                <HeroCard card={card} />
              </Suspense>
            </PageTransition>
          ))
        )}

        {/* League History - rendered immediately for LCP optimization (hidden on mobile, in nav grid) */}
        <div className="hidden md:block">
          <PageTransition animation="fadeInSlideUp" immediate>
            <LeagueHistoryBar />
          </PageTransition>
        </div>

        {/* My Next Match(es) - shown for authenticated users with a team */}
        {myNextMatch.isLoading ? (
          <MyNextMatchSkeleton />
        ) : myNextMatch.hasTeamMembership &&
          myNextMatch.matches.length > 0 &&
          myNextMatch.myTeam ? (
          <PageTransition animation="fadeInSlideUp" delay="short">
            <MyMatchesSection
              matches={myNextMatch.matches}
              myTeam={myNextMatch.myTeam}
              isPreviousMatches={myNextMatch.isPreviousMatches}
            />
          </PageTransition>
        ) : null}

        {/* Season Participation Card - shown when confirmation is open */}
        {showParticipationCard && (
          <PageTransition animation="fadeInSlideUp" delay="short">
            <Suspense fallback={<HeroCardSkeleton />}>
              <ParticipationHeroCard />
            </Suspense>
          </PageTransition>
        )}

        {/* Team of the Week */}
        {trendLoading ? (
          <TeamOfTheWeekSkeleton />
        ) : hasTeamOfWeek && trendData?.latestWeek ? (
          <PageTransition animation="fadeInSlideUp" delay="medium">
            <TeamOfTheWeekCard trend={topGainer} weekNumber={trendData.latestWeek} />
          </PageTransition>
        ) : null}

        {/* Weekly Recap — upsets, streaks, movers */}
        {recapLoading ? (
          <WeeklyRecapSkeleton />
        ) : recapData?.hasData ? (
          <PageTransition animation="fadeInSlideUp" delay="medium">
            <WeeklyRecapCard
              data={recapData}
              risers={trendData?.trends?.slice(1) ?? []}
              faller={fallerData?.trends?.[0]}
            />
          </PageTransition>
        ) : null}

        {hasPendingScores && (
          <PageTransition animation="fadeInSlideUp" delay="long">
            <PendingScoresCard />
          </PageTransition>
        )}

        {teamsLoading ? (
          <div className="animate-pulse bg-muted/30 rounded-lg" style={{ minHeight: '280px' }} />
        ) : (
          <PageTransition animation="fadeIn" delay="long">
            <Suspense fallback={<div className="animate-pulse bg-muted/30 rounded-lg" style={{ minHeight: '280px' }} />}>
              <TopTeams teams={topTeams} />
            </Suspense>
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

import React, { lazy, Suspense } from 'react';

import HeroCardSkeleton from '@/components/hero/HeroCardSkeleton';
import MyMatchesSection from '@/components/home/MyMatchesSection';
import MyNextMatchSkeleton from '@/components/home/MyNextMatchSkeleton';
import PendingScoresCard from '@/components/home/PendingScoresCard';
import PublishedRecapCard from '@/components/home/PublishedRecapCard';
import TeamOfTheWeekCard from '@/components/home/TeamOfTheWeekCard';
import TeamOfTheWeekSkeleton from '@/components/home/TeamOfTheWeekSkeleton';
import WeeklyRecapCard from '@/components/home/WeeklyRecapCard';
import { hasVisibleMovers } from '@/components/home/weeklyRecapMovers';
import WeeklyRecapSkeleton from '@/components/home/WeeklyRecapSkeleton';
import PageTransition from '@/components/transitions/PageTransition';
import { SectionError } from '@/components/ui/SectionError';
import { useHeroCards } from '@/hooks/useHeroCards';
import { useMyNextMatch } from '@/hooks/useMyNextMatch';
import { usePendingScoresMatches } from '@/hooks/usePendingScoresMatches';
import { usePublishedRecapEdition } from '@/hooks/useRecapEditions';
import { useConfirmationSeason } from '@/hooks/useSeasonParticipation';
import { useTeams } from '@/hooks/useTeams';
import { useWeeklyPowerScoreTrends } from '@/hooks/useWeeklyPowerScoreTrends';
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap';
import type { WeeklyRecapData } from '@/services/weeklyRecap/WeeklyRecapService';
import type { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';
import { pickTeamOfTheWeek } from '@/utils/powerScore/pickTeamOfTheWeek';

/*
 * The home page sections, one component each. They used to sit in the page
 * itself, which made `Index` one long list of loading, error and empty
 * branches. Each section now owns its own data hook, so the page only decides
 * the order. Sections that share a query (Team of the Week and the Weekly
 * Recap both read the weekly trends) ask for it with the same key, and
 * TanStack Query fetches it once.
 */

// Lazy load components that use framer-motion to defer vendor-motion chunk and improve TTI
const HeroCard = lazy(() => import('@/components/hero/HeroCard'));
const ParticipationHeroCard = lazy(() => import('@/components/hero/ParticipationHeroCard'));
const ContactCard = lazy(() => import('@/components/home/ContactCard'));
const TopTeams = lazy(() => import('@/components/home/TopTeams'));

const getDelay = (index: number) => {
  if (index === 0) return 'short' as const;
  if (index === 1) return 'medium' as const;
  return 'long' as const;
};

const TEAMS_PLACEHOLDER = (
  <div className="animate-pulse bg-muted/30 rounded-lg" style={{ minHeight: '280px' }} />
);

/**
 * Whether the Weekly Recap has anything to draw. hasData counts upsets and hot
 * streaks only — the recap service never sees the power-score trends, which
 * arrive from their own hook — so a movers-only week has to be asked about
 * separately or the whole card is dropped and the movers fetched for it thrown
 * away. Must match WeeklyRecapCard's own empty check, which is why both call
 * hasVisibleMovers.
 */
const hasRecapToShow = (
  recap: WeeklyRecapData | undefined,
  risers: WeeklyPowerScoreTrend[],
  faller?: WeeklyPowerScoreTrend
): recap is WeeklyRecapData =>
  Boolean(recap && (recap.hasData || hasVisibleMovers(risers, faller)));

/** Dynamic hero cards from the database, shown prominently below the header. */
export const HeroCardsSection: React.FC = () => {
  const { data: heroCards, isLoading, isError, error, refetch } = useHeroCards();

  return (
    <>
      {isLoading ? (
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

      {isError && (
        <SectionError
          title="League announcements"
          error={error}
          onRetry={() => {
            void refetch();
          }}
        />
      )}
    </>
  );
};

/** My Next Match(es) - shown for authenticated users with a team. */
export const MyNextMatchSection: React.FC = () => {
  const myNextMatch = useMyNextMatch();

  if (myNextMatch.isLoading) return <MyNextMatchSkeleton />;
  if (!myNextMatch.hasTeamMembership || myNextMatch.matches.length === 0 || !myNextMatch.myTeam) {
    return null;
  }

  return (
    <PageTransition animation="fadeIn" delay="short">
      <MyMatchesSection
        matches={myNextMatch.matches}
        myTeam={myNextMatch.myTeam}
        isPreviousMatches={myNextMatch.isPreviousMatches}
      />
    </PageTransition>
  );
};

/** Season Participation Card - shown when confirmation is open. */
export const ParticipationSection: React.FC = () => {
  const { data: confirmationSeason } = useConfirmationSeason();

  if (!confirmationSeason) return null;

  return (
    <PageTransition animation="fadeIn" delay="short">
      <Suspense fallback={<HeroCardSkeleton />}>
        <ParticipationHeroCard />
      </Suspense>
    </PageTransition>
  );
};

export const TeamOfTheWeekSection: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useWeeklyPowerScoreTrends('up', 3);
  // One shared rule, so a saved recap edition and this card cannot name
  // different teams. See services/rankings/weeklyTrendsForWeek.
  const topGainer = pickTeamOfTheWeek(data?.trends ?? []);

  if (isError) {
    return (
      <SectionError
        title="Team of the Week"
        error={error}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }
  if (isLoading) return <TeamOfTheWeekSkeleton />;
  if (topGainer === null || !data?.latestWeek) return null;

  return (
    <PageTransition animation="fadeIn" delay="medium">
      <TeamOfTheWeekCard trend={topGainer} weekNumber={data.latestWeek} />
    </PageTransition>
  );
};

/**
 * Weekly Recap. A published edition wins when there is one, because it is what
 * the league chose to say about the week. With none, this falls back to exactly
 * the live card it always showed — which is also the rollback path if an
 * edition is unpublished.
 */
export const WeeklyRecapSection: React.FC = () => {
  const { data: trendData, isLoading: trendLoading } = useWeeklyPowerScoreTrends('up', 3);
  const { data: fallerData, isLoading: fallerLoading } = useWeeklyPowerScoreTrends('down', 1);
  const {
    data: recapData,
    isLoading: recapLoading,
    isError: recapFailed,
    error: recapError,
    refetch: refetchRecap,
  } = useWeeklyRecap();
  const { data: publishedRecap, isLoading: publishedRecapLoading } = usePublishedRecapEdition();

  // The top riser is Team of the Week's, so the recap starts at the second.
  const topGainer = pickTeamOfTheWeek(trendData?.trends ?? []);
  const risers = (trendData?.trends ?? []).filter((t) => t.teamId !== topGainer?.teamId);
  const faller = fallerData?.trends?.[0];

  if (recapFailed && !publishedRecap) {
    return (
      <SectionError
        title="Weekly recap"
        error={recapError}
        onRetry={() => {
          void refetchRecap();
        }}
      />
    );
  }
  if (recapLoading || trendLoading || fallerLoading || publishedRecapLoading) {
    return <WeeklyRecapSkeleton />;
  }
  if (publishedRecap) {
    return (
      <PageTransition animation="fadeIn" delay="medium">
        <PublishedRecapCard edition={publishedRecap} />
      </PageTransition>
    );
  }
  if (!hasRecapToShow(recapData, risers, faller)) return null;

  return (
    <PageTransition animation="fadeIn" delay="medium">
      <WeeklyRecapCard data={recapData} risers={risers} faller={faller} />
    </PageTransition>
  );
};

export const PendingScoresSection: React.FC = () => {
  const { matches, isLoading } = usePendingScoresMatches();

  if (isLoading || matches.length === 0) return null;

  return (
    <PageTransition animation="fadeIn" delay="long">
      <PendingScoresCard />
    </PageTransition>
  );
};

/** Top teams by power score. */
export const TopTeamsSection: React.FC = () => {
  const { teams, isLoading, error, fetchTeams } = useTeams();

  const topTeams = React.useMemo(() => {
    if (!teams?.length) return [];
    return [...teams].sort((a, b) => (b.power_score ?? 0) - (a.power_score ?? 0)).slice(0, 10);
  }, [teams]);

  if (isLoading) return TEAMS_PLACEHOLDER;

  return (
    <PageTransition animation="fadeIn" delay="long">
      <Suspense fallback={TEAMS_PLACEHOLDER}>
        <TopTeams teams={topTeams} error={error} onRetry={fetchTeams} />
      </Suspense>
    </PageTransition>
  );
};

export const ContactSection: React.FC = () => (
  <PageTransition animation="fadeIn" delay="long">
    <Suspense fallback={<div className="h-32" />}>
      <ContactCard />
    </Suspense>
  </PageTransition>
);

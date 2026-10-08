import React from 'react';

import HeroSection from '@/components/home/HeroSection';
import {
  ContactSection,
  HeroCardsSection,
  MyNextMatchSection,
  ParticipationSection,
  PendingScoresSection,
  TeamOfTheWeekSection,
  TopTeamsSection,
  WeeklyRecapSection,
} from '@/components/home/IndexSections';
import LeagueHistoryBar from '@/components/home/LeagueHistoryBar';
import PageLayout from '@/components/layout/PageLayout';
import SeoHead from '@/components/seo/SeoHead';
import PageTransition from '@/components/transitions/PageTransition';
import { useIsMobile } from '@/hooks/useMobile';

/** League History - rendered immediately for LCP optimization (hidden on mobile, in nav grid) */
const LeagueHistorySlot: React.FC = () => (
  <div className="hidden md:block">
    <PageTransition animation="fadeIn" immediate>
      <LeagueHistoryBar />
    </PageTransition>
  </div>
);

/**
 * The home page. It only decides the order of the sections: each one in
 * `components/home/IndexSections` loads its own data and draws its own loading,
 * error and empty states.
 */
const Index: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <>
      <SeoHead
        title="717REC — Lancaster's Premier Cornhole League"
        description="Standings, schedules, team rankings, and playoff brackets for Lancaster PA's premier recreational cornhole league."
        path="/"
      />
      <PageLayout
        className="flex flex-col gap-4 md:gap-8"
        compact={isMobile}
        gradientVariant="blueOrange"
      >
        <PageTransition animation="fadeInSlideDown" immediate>
          <HeroSection />
        </PageTransition>

        <div className="container mx-auto px-4 flex flex-col gap-4 md:gap-8">
          <HeroCardsSection />

          <LeagueHistorySlot />

          <MyNextMatchSection />
          <ParticipationSection />
          <TeamOfTheWeekSection />
          <WeeklyRecapSection />
          <PendingScoresSection />
          <TopTeamsSection />
          <ContactSection />
        </div>
      </PageLayout>
    </>
  );
};

export default Index;

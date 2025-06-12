
import React from "react";
import { useTeams } from "@/hooks/useTeams";
import TopTeams from "@/components/home/TopTeams";
import CallToAction from "@/components/home/CallToAction";
import HeroSection from "@/components/home/HeroSection";
import ChampionsCard from "@/components/home/ChampionsCard";
import PageLayout from "@/components/layout/PageLayout";
import PageHeader from "@/components/layout/PageHeader";
import LoadingState from "@/components/ui/loading-state";
import { useIsMobile } from "@/hooks/use-mobile";
import PageTransition from "@/components/transitions/PageTransition";

const Index: React.FC = () => {
  const { teams, isLoading: teamsLoading } = useTeams();
  const isMobile = useIsMobile();
  
  const isLoading = teamsLoading;
  
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
        <PageTransition animation="fadeInSlideUp" delay="short">
          <ChampionsCard />
        </PageTransition>

        <PageTransition animation="fadeInSlideUp" delay="medium">
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


import React from "react";
import { useTeams } from "@/hooks/useTeams";
import { format, parseISO } from "date-fns";
import TopTeams from "@/components/home/TopTeams";
import CallToAction from "@/components/home/CallToAction";
import HeroSection from "@/components/home/HeroSection";
import PageLayout from "@/components/layout/PageLayout";
import LoadingState from "@/components/ui/loading-state";

const Index: React.FC = () => {
  const { teams, isLoading: teamsLoading } = useTeams();
  
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
    <PageLayout className="flex flex-col gap-8">
      <HeroSection />
      
      <div className="container mx-auto px-4 flex flex-col gap-8">
        <TopTeams teams={topTeams} />
        <CallToAction />
      </div>
    </PageLayout>
  );
};

export default Index;

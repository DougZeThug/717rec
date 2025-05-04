
import React from "react";
import { useTeams } from "@/hooks/useTeams";
import { useMatches } from "@/hooks/useMatches";
import { format, parseISO } from "date-fns";
import TopTeams from "@/components/home/TopTeams";
import RecentMatches from "@/components/home/RecentMatches";
import CallToAction from "@/components/home/CallToAction";
import HeroSection from "@/components/home/HeroSection";
import PageLayout from "@/components/layout/PageLayout";
import LoadingState from "@/components/ui/loading-state";

const Index: React.FC = () => {
  const { teams, isLoading: teamsLoading } = useTeams();
  const { matches, isLoading: matchesLoading } = useMatches();
  
  const isLoading = teamsLoading || matchesLoading;
  
  // Top teams by power score
  const topTeams = React.useMemo(() => {
    if (!teams?.length) return [];
    return [...teams]
      .sort((a, b) => (b.power_score ?? 0) - (a.power_score ?? 0))
      .slice(0, 4);
  }, [teams]);

  // Recent completed matches
  const completedMatches = React.useMemo(() => {
    if (!matches?.length) return [];
    return [...matches]
      .filter(match => match.iscompleted)
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 3);
  }, [matches]);

  // Utility functions for date formatting
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "h:mm a");
    } catch (e) {
      return "Invalid time";
    }
  };

  // Helper to get team by ID for match cards
  const getTeamById = (id: string) => {
    return teams?.find(team => team.id === id);
  };
  
  if (isLoading) {
    return <LoadingState fullscreen message="Loading league data..." size="lg" />;
  }
  
  return (
    <PageLayout className="flex flex-col gap-8">
      <HeroSection />
      
      <div className="container mx-auto px-4 flex flex-col gap-8">
        <TopTeams teams={topTeams} />
        
        <section className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-cornhole-navy dark:text-white font-sans">
            Recent Matches
          </h2>
          <RecentMatches
            completedMatches={completedMatches}
            getTeamById={getTeamById}
            formatDate={formatDate}
            formatTime={formatTime}
          />
        </section>
        
        <CallToAction />
      </div>
    </PageLayout>
  );
};

export default Index;

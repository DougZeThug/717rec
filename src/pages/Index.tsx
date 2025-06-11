
import React from "react";
import PageLayout from "@/components/layout/PageLayout";
import HeroSection from "@/components/home/HeroSection";
import RecentMatches from "@/components/home/RecentMatches";
import TopTeams from "@/components/home/TopTeams";
import ChampionsCard from "@/components/home/ChampionsCard";
import PlayoffsAnnouncementBanner from "@/components/home/PlayoffsAnnouncementBanner";
import WeeklyHeatTeaser from "@/components/home/WeeklyHeatTeaser";
import { useScheduleData } from "@/hooks/useScheduleData";
import { useTeamFetching } from "@/hooks/useTeamFetching";

const Index = () => {
  const { completedMatches, matchesLoading } = useScheduleData();
  const { teams: teamsMap, isLoading: teamsLoading } = useTeamFetching();

  // Convert teams map to array and get top teams by power score
  const teamsArray = Object.values(teamsMap);
  const topTeams = teamsArray
    .sort((a, b) => (b.power_score || 0) - (a.power_score || 0))
    .slice(0, 8);

  // Helper functions for date/time formatting
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Helper function to get team by ID
  const getTeamById = (id: string) => {
    return teamsMap[id];
  };

  // Get recent completed matches (limit to 6 for display)
  const recentCompletedMatches = completedMatches.slice(0, 6);

  return (
    <PageLayout>
      <div className="space-y-8">
        <HeroSection />
        <PlayoffsAnnouncementBanner />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <RecentMatches 
              completedMatches={recentCompletedMatches}
              getTeamById={getTeamById}
              formatDate={formatDate}
              formatTime={formatTime}
              isLoading={matchesLoading}
            />
          </div>
          <div className="space-y-6">
            <WeeklyHeatTeaser />
            <TopTeams teams={topTeams} />
            <ChampionsCard />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Index;

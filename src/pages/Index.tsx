
import React from "react";
import PageLayout from "@/components/layout/PageLayout";
import HeroSection from "@/components/home/HeroSection";
import RecentMatches from "@/components/home/RecentMatches";
import TopTeams from "@/components/home/TopTeams";
import ChampionsCard from "@/components/home/ChampionsCard";
import PlayoffsAnnouncementBanner from "@/components/home/PlayoffsAnnouncementBanner";
import WeeklyHeatTeaser from "@/components/home/WeeklyHeatTeaser";

const Index = () => {
  return (
    <PageLayout>
      <div className="space-y-8">
        <HeroSection />
        <PlayoffsAnnouncementBanner />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* RecentMatches component will handle its own data fetching */}
            <RecentMatches />
          </div>
          <div className="space-y-6">
            <WeeklyHeatTeaser />
            {/* TopTeams component will handle its own data fetching */}
            <TopTeams />
            <ChampionsCard />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Index;

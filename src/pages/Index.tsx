import React from "react";
import { useTeamData } from "@/hooks/useTeamData";
import { mockMatches } from "@/data/mockData";
import NavAnchors from "@/components/navigation/NavAnchors";
import HeroSection from "@/components/home/HeroSection";
import RecentMatches from "@/components/home/RecentMatches";
import TopTeams from "@/components/home/TopTeams";
import CallToAction from "@/components/home/CallToAction";
import LoadingState from "@/components/home/LoadingState";
import { formatDate, formatTime } from "@/components/home/utils";

const Index = () => {
  const { data: teams, isLoading } = useTeamData();

  const completedMatches = mockMatches
    .filter(match => match.iscompleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const topTeams = teams 
    ? [...teams]
        .sort((a, b) => (b.power_score || 0) - (a.power_score || 0))
        .slice(0, 4)
    : [];

  const getTeamById = (id: string) => {
    return teams?.find(team => team.id === id);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen cornhole-bg">
      {/* Hero Section */}
      <HeroSection />

      {/* Navigation Anchors component is still imported but won't render on homepage
         because we added the condition in NavAnchors.tsx */}
      <NavAnchors />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Completed Matches */}
        <RecentMatches 
          completedMatches={completedMatches} 
          getTeamById={getTeamById}
          formatDate={formatDate}
          formatTime={formatTime}
        />

        {/* Top Teams */}
        <TopTeams teams={topTeams} />
      </div>

      {/* Call To Action */}
      <CallToAction />
    </div>
  );
};

export default Index;

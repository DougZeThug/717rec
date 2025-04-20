
import React from "react";
import { useTeamData } from "@/hooks/useTeamData";
import { mockMatches } from "@/data/mockData";
import NavAnchors from "@/components/navigation/NavAnchors";
import HeroSection from "@/components/home/HeroSection";
import RecentMatches from "@/components/home/RecentMatches";
import TopTeams from "@/components/home/TopTeams";
import GraphOfTheWeek from "@/components/home/GraphOfTheWeek";
import TrendingTeams from "@/components/home/TrendingTeams";
import CallToAction from "@/components/home/CallToAction";
import LoadingState from "@/components/home/LoadingState";
import { formatDate, formatTime } from "@/components/home/utils";
import { useHistoricalPowerScores } from "@/hooks/useHistoricalPowerScores";
import { getTrendingTeams } from "@/utils/powerScore/getTrendingTeams";

const Index = () => {
  const { data: teams, isLoading } = useTeamData();
  const { previousScores } = useHistoricalPowerScores();

  const completedMatches = mockMatches
    .filter(match => match.iscompleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const topTeams = teams 
    ? [...teams]
        .sort((a, b) => (b.power_score || 0) - (a.power_score || 0))
        .slice(0, 4)
    : [];

  // Get trending teams based on power score increases
  const trendingTeamsData = teams 
    ? getTrendingTeams(teams, previousScores).slice(0, 5)
    : [];

  // Select a featured team for Graph of the Week
  // For now, we'll choose the team with the highest power score
  const featuredTeam = topTeams.length > 0 ? topTeams[0] : undefined;

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Graph of the Week */}
          <GraphOfTheWeek featuredTeam={featuredTeam} />
          
          {/* Trending Teams */}
          <div>
            <TrendingTeams trendingTeams={trendingTeamsData} />
          </div>
        </div>
      </div>

      {/* Call To Action */}
      <CallToAction />
    </div>
  );
};

export default Index;

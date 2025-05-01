
import React from "react";
import { useTeamData } from "@/hooks/useTeamData";
import { mockMatches } from "@/data/mockData";
import NavAnchors from "@/components/navigation/NavAnchors";
import HeroSection from "@/components/home/HeroSection";
import RecentMatches from "@/components/home/RecentMatches";
import RecentMatchesSkeleton from "@/components/home/RecentMatchesSkeleton";
import TopTeams from "@/components/home/TopTeams";
import CallToAction from "@/components/home/CallToAction";
import LoadingState from "@/components/home/LoadingState";
import { formatDate, formatTime } from "@/components/home/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
    return (
      <div className="min-h-screen cornhole-bg">
        <HeroSection />
        <NavAnchors />
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Recent Matches Skeleton */}
          <RecentMatchesSkeleton />
          
          {/* Top Teams Skeleton */}
          <div className="bg-gray-50 dark:bg-gray-900 py-6 md:py-8 rounded-xl shadow-sm">
            <div className="flex flex-wrap justify-between items-center px-3 md:px-0 mb-4">
              <div>
                <Skeleton className="h-8 w-36 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-3 md:px-0">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl shadow-sm bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-700">
                  <div className="h-40 bg-gray-100 dark:bg-gray-800/50" />
                  <div className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Call To Action */}
        <CallToAction />
      </div>
    );
  }

  return (
    <div className="min-h-screen cornhole-bg">
      <HeroSection />
      <NavAnchors />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Recent Matches */}
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

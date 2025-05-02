import React, { useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTeamData } from "@/hooks/useTeamData";
import { useDivisions } from "@/hooks/useDivisions";
import { Match } from "@/types";
import { ArrowDown } from "lucide-react";
import StatsSummaryCards from "@/components/stats/StatsSummaryCards";
import StatsCharts from "@/components/stats/StatsCharts";
import StatsLoadingState from "./StatsLoadingState";
import StatsErrorState from "./StatsErrorState";
import FullRankings from "./FullRankings";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamListSkeleton } from "@/components/teams/TeamListSkeleton";

interface StatsContainerProps {
  matches: Match[];
  isLoadingMatches: boolean;
  matchesError: Error | null;
}

const StatsContainer = ({ matches, isLoadingMatches, matchesError }: StatsContainerProps) => {
  const [selectedDivision, setSelectedDivision] = React.useState<string | null>(null);
  const { 
    data: teams, 
    isLoading: isLoadingTeams, 
    error: teamsError 
  } = useTeamData(selectedDivision);
  const isMobile = useIsMobile();
  const { rankings, isLoading: isLoadingRankings } = useTeamRankings(teams, matches);
  const fullRankingsRef = useRef<HTMLDivElement>(null);

  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const isLoading = isLoadingTeams || isLoadingMatches || isLoadingRankings;
  const hasError = teamsError || matchesError;

  const scrollToFullRankings = () => {
    if (fullRankingsRef.current) {
      fullRankingsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (hasError) {
    return <StatsErrorState teamsError={teamsError} matchesError={matchesError} />;
  }

  const chartLimit = isMobile ? 5 : 8;
  const compactLimit = isMobile ? 5 : 5;

  // Create skeleton for loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto bg-[#fafafa] dark:bg-transparent px-2 sm:px-4">
        <div className="mt-2 mb-1">
          <Skeleton className="h-8 w-64 mb-4" />
        </div>
        <div className="font-inter">
          <Card className="mb-4 bg-white text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#1E1E1E] dark:text-white dark:border-none rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-0">
            <CardHeader className="pb-1.5 rounded-t-xl">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="p-4 pt-1 sm:pt-4">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 border-b border-gray-100 dark:border-gray-800">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                    <div className="ml-auto flex gap-4">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <Skeleton className="h-9 w-48 mx-auto" />
              </div>
            </CardContent>
          </Card>
          
          <div className="mb-5">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Card key={idx} className="bg-white dark:bg-[#1E1E1E]">
                  <CardHeader className="p-4 pb-0">
                    <Skeleton className="h-5 w-24 mb-1" />
                    <Skeleton className="h-7 w-16" />
                  </CardHeader>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-white dark:bg-[#1E1E1E] border border-[#e0e0e0] dark:border-gray-800">
                <CardHeader>
                  <Skeleton className="h-6 w-48 mb-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-[#1E1E1E] border border-[#e0e0e0] dark:border-gray-800">
                <CardHeader>
                  <Skeleton className="h-6 w-48 mb-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <Card className="bg-white dark:bg-[#1E1E1E]">
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
              </CardHeader>
              <CardContent>
                <TeamListSkeleton viewMode="list" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const cardBg = "bg-white text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#1E1E1E] dark:text-white dark:border-none rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]";

  return (
    <div className="max-w-7xl mx-auto bg-[#fafafa] dark:bg-transparent px-2 sm:px-4">
      <div className="mt-2 mb-1">
        <h1 className="font-oswald text-3xl sm:text-4xl uppercase font-semibold tracking-wide text-cornhole-navy mb-1 sm:mb-2" style={{ letterSpacing: ".05em" }}>
          Team Statistics
        </h1>
      </div>
      <div className="font-inter">
        {rankings.length > 0 ? (
          <>
            <Card className={`mb-4 ${cardBg} p-0`}>
              <CardHeader className="pb-1.5 rounded-t-xl"
                style={isLight ? { borderBottom: '1px solid #e0e0e0', borderTopLeftRadius: 12, borderTopRightRadius: 12, background: '#fff' } : {}}>
                <CardTitle className="font-semibold text-lg sm:text-xl font-inter tracking-wide text-[#1a1a1a] dark:text-white uppercase" style={{ letterSpacing: ".03em" }}>
                  Current Standings
                </CardTitle>
                <CardDescription className="text-[#333] dark:text-gray-400 font-light font-inter mt-1 mb-0">
                  Top {compactLimit} teams based on performance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-1 sm:pt-4">
                <CompactStandings rankings={rankings.slice(0, compactLimit)} />
                <div className="mt-3 text-center">
                  <Button
                    onClick={scrollToFullRankings}
                    variant="outline"
                    className="flex items-center gap-2 rounded-lg px-5 py-2 font-inter font-semibold bg-white text-[#1a1a1a] hover:bg-[#f0f0f0] border border-[#e0e0e0] dark:bg-transparent dark:text-white dark:border-gray-700 text-base"
                  >
                    View Full Standings
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div className="mb-5">
              <h2 className="font-inter text-lg sm:text-xl font-semibold tracking-wide text-[#1a1a1a] dark:text-white mb-1 uppercase" style={{ letterSpacing: ".03em" }}>
                League Highlights
              </h2>
              <StatsSummaryCards rankings={rankings} />
            </div>

            <div className="mb-4">
              {/* Pass the full rankings array - each chart will handle its own sorting */}
              <StatsCharts rankings={rankings} chartLimit={chartLimit} />
            </div>

            <div ref={fullRankingsRef} id="rankings" className="scroll-mt-16">
              <FullRankings rankings={rankings} />
            </div>
          </>
        ) : (
          <NoTeamsAvailable />
        )}
      </div>
    </div>
  );
};

const NoTeamsAvailable = () => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  return (
    <Card className="bg-white text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#1E1E1E] dark:text-white dark:border-none rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-inter">
      <CardHeader>
        <CardTitle className="text-[#1a1a1a] dark:text-white font-bold">No Teams Available</CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400 font-light">
          There are no teams in the selected division or no teams have been added yet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 dark:text-gray-300 font-inter">
          Try selecting a different division or add teams to view statistics.
        </p>
      </CardContent>
    </Card>
  );
};

import { useTeamRankings } from "@/hooks/useTeamRankings";
import CompactStandings from "@/components/stats/CompactStandings";

export default StatsContainer;


import React, { useRef, useCallback } from "react";
import { useTeamRankings } from "@/hooks/useTeamRankings";
import { useTeamData } from "@/hooks/useTeamData";
import { Match } from "@/types";
import StatsErrorState from "../StatsErrorState";
import StatsPageHeader from "./StatsPageHeader";
import StatsSummarySection from "./StatsSummarySection";
import StatsChartsSection from "./StatsChartsSection";
import FullRankingsSection from "./FullRankingsSection";
import LoadingStateContainer from "./LoadingStateContainer";
import CareerRankingsSection from "../career/CareerRankingsSection";
import { AllTeamsCareerPowerScoreChart } from "../career/AllTeamsCareerPowerScoreChart";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useIsMobile } from "@/hooks/use-mobile";

interface StatsContainerProps {
  matches: Match[];
  isLoadingMatches: boolean;
  matchesError: Error | null;
}

const StatsContainer = ({ matches, isLoadingMatches, matchesError, onRefresh }: StatsContainerProps & { onRefresh?: () => Promise<void> }) => {
  const isMobile = useIsMobile();
  const [selectedDivision, setSelectedDivision] = React.useState<string | null>(null);
  const { 
    data: teams, 
    isLoading: isLoadingTeams, 
    error: teamsError,
    refetch: refetchTeams
  } = useTeamData(selectedDivision);
  const { rankings, isLoading: isLoadingRankings } = useTeamRankings(teams, matches);
  const fullRankingsRef = useRef<HTMLDivElement>(null);

  const isLoading = isLoadingTeams || isLoadingMatches || isLoadingRankings;
  const hasError = teamsError || matchesError;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchTeams(),
      onRefresh?.()
    ]);
  }, [refetchTeams, onRefresh]);

  const scrollToFullRankings = () => {
    if (fullRankingsRef.current) {
      fullRankingsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (hasError) {
    return <StatsErrorState teamsError={teamsError} matchesError={matchesError} />;
  }

  if (isLoading) {
    return <LoadingStateContainer />;
  }

  const content = (
    <div className="max-w-7xl mx-auto bg-[#fafafa] dark:bg-transparent px-2 sm:px-4">
      <StatsPageHeader />
      
      <div className="font-inter">
        {rankings.length > 0 ? (
          <>
            <StatsSummarySection 
              rankings={rankings} 
              scrollToFullRankings={scrollToFullRankings} 
            />
            
            <StatsChartsSection rankings={rankings} />

            <AllTeamsCareerPowerScoreChart />

            <div ref={fullRankingsRef} id="rankings" className="scroll-mt-16">
              <FullRankingsSection rankings={rankings} />
            </div>
            
            <CareerRankingsSection />
          </>
        ) : (
          <NoTeamsAvailable />
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        {content}
      </PullToRefresh>
    );
  }

  return content;
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "next-themes";

export default StatsContainer;

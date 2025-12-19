
import React from "react";
import { useTeamRankings } from "@/hooks/useTeamRankings";
import { useTeamData } from "@/hooks/useTeamData";
import { Match } from "@/types";
import StatsErrorState from "../StatsErrorState";
import StatsPageHeader from "./StatsPageHeader";
import StatsChartsSection from "./StatsChartsSection";
import FullRankingsSection from "./FullRankingsSection";
import LoadingStateContainer from "./LoadingStateContainer";
import CareerRankingsSection from "../career/CareerRankingsSection";
import { AllTeamsCareerPowerScoreChart } from "../career/AllTeamsCareerPowerScoreChart";

interface StatsContainerProps {
  matches: Match[];
  isLoadingMatches: boolean;
  matchesError: Error | null;
}

const StatsContainer = ({ matches, isLoadingMatches, matchesError }: StatsContainerProps) => {
  const { 
    data: teams, 
    isLoading: isLoadingTeams, 
    error: teamsError,
  } = useTeamData(null);
  const { rankings, isLoading: isLoadingRankings } = useTeamRankings(teams, matches);

  const isLoading = isLoadingTeams || isLoadingMatches || isLoadingRankings;
  const hasError = teamsError || matchesError;

  if (hasError) {
    return <StatsErrorState teamsError={teamsError} matchesError={matchesError} />;
  }

  if (isLoading) {
    return <LoadingStateContainer />;
  }

  return (
    <div className="max-w-7xl mx-auto bg-[#fafafa] dark:bg-transparent px-2 sm:px-4">
      <StatsPageHeader />
      
      <div className="font-inter">
        {rankings.length > 0 ? (
          <>
            <FullRankingsSection rankings={rankings} />
            
            <StatsChartsSection rankings={rankings} />

            <AllTeamsCareerPowerScoreChart />
            
            <CareerRankingsSection />
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "next-themes";

export default StatsContainer;

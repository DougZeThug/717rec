import React, { Suspense, lazy } from "react";
import { useTeamRankings } from "@/hooks/useTeamRankings";
import { useTeamsQuery } from "@/hooks/teams";
import { Match } from "@/types";
import StatsErrorState from "../StatsErrorState";
import StatsPageHeader from "./StatsPageHeader";
import StatsChartsSection from "./StatsChartsSection";
import FullRankingsSection from "./FullRankingsSection";
import LoadingStateContainer from "./LoadingStateContainer";
import CareerRankingsSection from "../career/CareerRankingsSection";
import { Skeleton } from "@/components/ui/skeleton";
import WinterSection from "@/components/winter/WinterSection";
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Lazy load the chart component to defer loading recharts bundle
const AllTeamsCareerPowerScoreChart = lazy(() => 
  import("../career/AllTeamsCareerPowerScoreChart").then(module => ({ 
    default: module.AllTeamsCareerPowerScoreChart 
  }))
);

interface StatsContainerProps {
  matches: Match[];
  isLoadingMatches: boolean;
  matchesError: Error | null;
}

const StatsContainer = ({ matches, isLoadingMatches, matchesError }: StatsContainerProps) => {
  const { isWinterTheme } = useSeasonalTheme();
  const { 
    data: teams, 
    isLoading: isLoadingTeams, 
    error: teamsError,
  } = useTeamsQuery();
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
    <WinterSection
      showIcicles
      lightIcicles
      className={cn(
        "max-w-7xl mx-auto px-2 sm:px-4",
        isWinterTheme ? "bg-transparent" : "bg-gray-50 dark:bg-transparent"
      )}
    >
      <StatsPageHeader />
      
      <div className="font-inter">
        {rankings.length > 0 ? (
          <>
            <FullRankingsSection rankings={rankings} />
            
            <StatsChartsSection rankings={rankings} />

            <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
              <AllTeamsCareerPowerScoreChart />
            </Suspense>
            
            <CareerRankingsSection />
          </>
        ) : (
          <NoTeamsAvailable />
        )}
      </div>
    </WinterSection>
  );
};

const NoTeamsAvailable = () => (
  <Card className="bg-card text-card-foreground border border-border rounded-xl shadow-sm font-inter">
    <CardHeader>
      <CardTitle className="font-bold">No Teams Available</CardTitle>
      <CardDescription>
        There are no teams in the selected division or no teams have been added yet.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground font-inter">
        Try selecting a different division or add teams to view statistics.
      </p>
    </CardContent>
  </Card>
);

export default StatsContainer;

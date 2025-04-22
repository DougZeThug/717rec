
import React, { useRef } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useTeamData } from "@/hooks/useTeamData";
import { useDivisions } from "@/hooks/useDivisions";
import { Match } from "@/types";
import { ArrowDown } from "lucide-react";
import StatsHeader from "@/components/stats/StatsHeader";
import StatsSummaryCards from "@/components/stats/StatsSummaryCards";
import StatsCharts from "@/components/stats/StatsCharts";
import StatsLoadingState from "./StatsLoadingState";
import StatsErrorState from "./StatsErrorState";
import FullRankings from "./FullRankings";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";

interface StatsContainerProps {
  matches: Match[];
  isLoadingMatches: boolean;
  matchesError: Error | null;
}

const StatsContainer = ({ matches, isLoadingMatches, matchesError }: StatsContainerProps) => {
  const [selectedDivision, setSelectedDivision] = React.useState<string | null>(null);
  const { divisions, isLoading: isLoadingDivisions } = useDivisions();
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

  const isLoading = isLoadingTeams || isLoadingDivisions || isLoadingMatches || isLoadingRankings;
  const hasError = teamsError || matchesError;

  const handleDivisionChange = (value: string) => {
    setSelectedDivision(value === "all" ? null : value);
  };
  
  const scrollToFullRankings = () => {
    if (fullRankingsRef.current) {
      fullRankingsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return <StatsLoadingState />;
  }

  if (hasError) {
    return <StatsErrorState teamsError={teamsError} matchesError={matchesError} />;
  }

  const chartLimit = isMobile ? 5 : 8;
  const compactLimit = isMobile ? 5 : 5;
  
  const topTeamsData = rankings.slice(0, chartLimit).map(team => ({
    id: team.teamId,
    name: team.teamName,
    wins: team.wins,
    losses: team.losses,
    winPercentage: Number((team.winPercentage * 100).toFixed(1)),
    powerScore: team.powerScore || 0,
    sos: Number((team.sos || 0).toFixed(3)),
    logoUrl: team.logoUrl,
    imageUrl: team.imageUrl
  }));

  // Card layout classes
  const sectionCard = "bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 mb-6";
  const headerClass = "text-xl font-semibold font-oswald uppercase tracking-wide flex items-center";
  const dividerClass = "border-b border-gray-200 dark:border-gray-700 w-full mt-2 mb-4";
  const sectionSpacing = "mt-6";

  // Wrap each major block in a card
  return (
    <div className="max-w-7xl mx-auto bg-[#fafafa] dark:bg-transparent">
      {/* Filters/Header outside cards for clarity */}
      <div className="mb-4">
        <StatsHeader 
          onDivisionChange={handleDivisionChange} 
          divisions={divisions || []} 
        />
      </div>
      <div className="font-inter">
        {rankings.length > 0 ? (
          <>
            {/* Current Standings Card */}
            <div className={sectionCard}>
              <div className={headerClass}>
                <span>Current Standings</span>
              </div>
              <div className={dividerClass}></div>
              <CardDescription className="!text-[#444444] dark:!text-gray-400 mb-2">
                Top {compactLimit} teams based on performance
              </CardDescription>
              <CardContent className="p-0">
                <CompactStandings rankings={rankings.slice(0, compactLimit)} />
                <div className="mt-4 text-center">
                  <Button 
                    onClick={scrollToFullRankings}
                    variant="outline" 
                    className="flex items-center gap-2 rounded-lg px-6 py-3 font-inter font-semibold bg-white text-[#1a1a1a] hover:bg-[#f0f0f0] border border-[#e0e0e0] dark:bg-transparent dark:text-white dark:border-gray-700"
                  >
                    View Full Standings
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </div>
            
            {/* League Highlights Card */}
            <div className={sectionCard}>
              <div className={headerClass}>
                <span>League Highlights</span>
              </div>
              <div className={dividerClass}></div>
              <div>
                <StatsSummaryCards rankings={rankings} />
              </div>
            </div>

            {/* Charts Card */}
            <div className={sectionCard}>
              <StatsCharts chartData={topTeamsData} chartLimit={chartLimit} dividerClass={dividerClass} />
            </div>
            
            {/* Complete Team Rankings */}
            <div ref={fullRankingsRef} id="rankings" className={sectionSpacing}>
              <div className={sectionCard + " mb-10"}>
                <FullRankings rankings={rankings} />
              </div>
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

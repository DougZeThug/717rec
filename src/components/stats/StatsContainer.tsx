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

  const { theme } = useTheme();
  const isLight = theme === 'light';

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

  const cardBg = "bg-white text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#1E1E1E] dark:text-white dark:border-none rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]";
  
  return (
    <div className="max-w-7xl mx-auto bg-[#fafafa] dark:bg-transparent">
      <StatsHeader 
        onDivisionChange={handleDivisionChange} 
        divisions={divisions || []} 
      />
      <div className="font-inter mt-2">
        {rankings.length > 0 ? (
          <>
            <Card className={`mb-6 ${cardBg} p-0`}>
              <CardHeader className="pb-2 rounded-t-xl" style={isLight ? { borderBottom: '1px solid #e0e0e0', borderTopLeftRadius: 12, borderTopRightRadius: 12, background: '#fff' } : {}}>
                <CardTitle className="font-bold text-[1.15rem] sm:text-xl text-[#1a1a1a] dark:text-white">Current Standings</CardTitle>
                <CardDescription className="text-[#333] dark:text-gray-400">
                  Top {compactLimit} teams based on performance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-2 sm:pt-6">
                <CompactStandings rankings={rankings.slice(0, compactLimit)} theme={theme} />
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
            </Card>
            
            <div className="mb-8">
              <h2 className="text-[1.12rem] font-bold mb-4 text-[#1a1a1a] dark:text-white">League Highlights</h2>
              <StatsSummaryCards rankings={rankings} theme={theme} />
            </div>

            <StatsCharts chartData={topTeamsData} chartLimit={chartLimit} theme={theme} />

            <div ref={fullRankingsRef} id="rankings" className="scroll-mt-16">
              <FullRankings rankings={rankings} />
            </div>
          </>
        ) : (
          <NoTeamsAvailable theme={theme} />
        )}
      </div>
    </div>
  );
};

const NoTeamsAvailable = ({ theme }: { theme: string }) => {
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

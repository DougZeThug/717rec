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

  const themeClass = theme === 'light' ? 'light-theme' : 'dark-theme';
  const cardBg =
    isLight
      ? 'bg-[#fff] border border-[#e0e0e0] text-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
      : 'bg-[#1E1E1E] text-white';
  const cardShadow = 'rounded-xl font-inter';

  return (
    <div className={`max-w-7xl mx-auto ${themeClass}`}>
      <StatsHeader 
        onDivisionChange={handleDivisionChange} 
        divisions={divisions || []} 
      />
      <div className="font-inter mt-2">
        {rankings.length > 0 ? (
          <>
            <Card className={`mb-6 ${cardBg} ${cardShadow}`}>
              <CardHeader className="pb-2">
                <CardTitle className="font-bold text-[1.15rem] sm:text-xl" style={isLight ? {color:'#1a1a1a'} : {color:'#fff'}}>Current Standings</CardTitle>
                <CardDescription className={isLight ? 'text-[#333]' : 'text-gray-400'}>
                  Top {compactLimit} teams based on performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompactStandings rankings={rankings.slice(0, compactLimit)} theme={theme} />
                <div className="mt-4 text-center">
                  <Button 
                    onClick={scrollToFullRankings}
                    variant="outline" 
                    className={`flex items-center gap-2 rounded-lg px-6 py-3 font-inter font-semibold 
                      ${isLight ? "bg-white text-[#1a1a1a] hover:bg-[#f0f0f0] border border-[#e0e0e0]" : ""}
                    `}
                  >
                    View Full Standings
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div className="mb-8">
              <h2 className={`text-[1.12rem] font-bold mb-4 ${isLight ? 'text-[#1a1a1a]' : 'text-white'}`}>League Highlights</h2>
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
  const cardBg = theme === 'light' ? 'bg-[#f5f5f5] border border-[#e0e0e0] text-[#1a1a1a]' : 'bg-[#1E1E1E] text-white';
  return (
    <Card className={`${cardBg} rounded-xl shadow font-inter`}>
      <CardHeader>
        <CardTitle className={theme === "light" ? "text-[#1a1a1a] font-bold" : "text-white font-bold"}>No Teams Available</CardTitle>
        <CardDescription className={theme === "light" ? "text-gray-600 font-light" : "text-gray-400 font-light"}>
          There are no teams in the selected division or no teams have been added yet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className={theme === "light" ? "text-gray-700 font-inter" : "text-gray-300 font-inter"}>
          Try selecting a different division or add teams to view statistics.
        </p>
      </CardContent>
    </Card>
  );
};

import { useTeamRankings } from "@/hooks/useTeamRankings";
import CompactStandings from "@/components/stats/CompactStandings";

export default StatsContainer;

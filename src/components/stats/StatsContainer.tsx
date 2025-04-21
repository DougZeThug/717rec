import React, { useRef, useState, useEffect } from "react";
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
import { Loader2, AlertTriangle, ArrowDown } from "lucide-react";
import { useTeamRankings } from "@/hooks/useTeamRankings";
import StatsHeader from "@/components/stats/StatsHeader";
import StatsSummaryCards from "@/components/stats/StatsSummaryCards";
import StatsCharts from "@/components/stats/StatsCharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CompactStandings from "@/components/stats/CompactStandings";
import RankingsTable from "@/components/stats/RankingsTable";
import StatsLoadingState from "./StatsLoadingState";
import StatsErrorState from "./StatsErrorState";
import FullRankings from "./FullRankings";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePowerScoresData } from "@/hooks/power-score/usePowerScoresData";
import PowerScoreScatterPlot from "./PowerScoreScatterPlot";
import { Ranking } from "@/types";

interface StatsContainerProps {
  matches: Match[];
  isLoadingMatches: boolean;
  matchesError: Error | null;
}

// Define the expected chart data item type to match what StatsCharts expects
interface ChartDataItem {
  name: string;
  id: string;
  wins: number;
  losses: number;
  winPercentage: number;
  powerScore: number;
  logoUrl?: string | null;
  imageUrl?: string | null;
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

  const { top10 = [], allTeams = [], isLoadingTop = false, isLoadingAll = false } = usePowerScoresData();

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

  useEffect(() => {
    console.log("Rankings data:", rankings);
    console.log("Top10 data:", top10);
  }, [rankings, top10]);

  if (isLoading) {
    return <StatsLoadingState />;
  }

  if (hasError) {
    return <StatsErrorState teamsError={teamsError} matchesError={matchesError} />;
  }

  if (!rankings || rankings.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Rankings Available</CardTitle>
            <CardDescription>There are no rankings data available at this time.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Please check back later or contact your administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartLimit = isMobile ? 5 : 8;

  const topTeams = (() => {
    try {
      if (Array.isArray(top10) && top10.length > 0) {
        return top10.filter((team: any) => {
          const powerScore = team.power_score !== undefined ? team.power_score : team.powerScore;
          return powerScore !== null && powerScore !== undefined;
        }).slice(0, 10);
      } else {
        return rankings.filter(team => team.powerScore !== undefined && team.powerScore !== null)
                       .slice(0, 10);
      }
    } catch (err) {
      console.error("Error processing top teams data:", err);
      return rankings.slice(0, 10);
    }
  })();

  const topTeamsForRankings = topTeams.map((team: any) => {
    try {
      if (team.teamId) return team as Ranking;
      
      return {
        teamId: team.team_id || team.id || '',
        teamName: team.team_name || team.name || '',
        logoUrl: team.logo_url || null,
        imageUrl: team.image_url || null,
        wins: team.wins || 0,
        losses: team.losses || 0,
        winPercentage: team.win_percentage || 0,
        divisionName: team.division || team.divisionName || 'Unassigned',
        sos: team.sos || 0,
        streak: undefined,
        headToHead: {},
        powerScore: team.power_score || 0,
        gamesWon: team.game_wins || 0,
        gamesLost: team.game_losses || 0,
        gameWinPercentage: team.game_win_percentage || 0,
        closeMatchLosses: team.close_match_losses || 0,
        rankChange: undefined,
        previousRank: undefined
      } as Ranking;
    } catch (err) {
      console.error("Error mapping team data:", err, team);
      return {
        teamId: team.team_id || team.id || 'unknown',
        teamName: team.team_name || team.name || 'Unknown Team',
        logoUrl: null,
        imageUrl: null,
        wins: 0,
        losses: 0,
        winPercentage: 0,
        divisionName: 'Unassigned',
        sos: 0,
        streak: undefined,
        headToHead: {},
        powerScore: 0,
        gamesWon: 0,
        gamesLost: 0,
        gameWinPercentage: 0,
        closeMatchLosses: 0,
        rankChange: undefined,
        previousRank: undefined
      } as Ranking;
    }
  });

  const chartData: ChartDataItem[] = topTeamsForRankings.map(team => ({
    id: team.teamId,
    name: team.teamName,
    wins: team.wins,
    losses: team.losses,
    winPercentage: team.winPercentage,
    powerScore: team.powerScore,
    logoUrl: team.logoUrl,
    imageUrl: team.imageUrl
  }));

  return (
    <div className="max-w-7xl mx-auto">
      <StatsHeader 
        onDivisionChange={handleDivisionChange} 
        divisions={divisions || []} 
      />

      {(isLoadingTop) ? (
        <StatsLoadingState />
      ) : rankings.length > 0 ? (
        <>
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle>Current Standings</CardTitle>
              <CardDescription>Top 10 teams based on performance</CardDescription>
            </CardHeader>
            <CardContent>
              <CompactStandings rankings={topTeamsForRankings} />
              <div className="mt-4 text-center">
                <Button 
                  onClick={scrollToFullRankings}
                  variant="outline" 
                  className="flex items-center gap-2"
                >
                  View Full Standings
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-cornhole-navy mb-4">League Highlights</h2>
            <StatsSummaryCards rankings={rankings} />
          </div>

          <StatsCharts 
            chartData={chartData.slice(0, chartLimit)} 
            chartLimit={chartLimit} 
          />

          <div ref={fullRankingsRef} id="rankings" className="scroll-mt-16 mb-8">
            <FullRankings rankings={rankings} />
          </div>

          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">📊 Power Score vs SOS Chart</h2>
            {(isLoadingAll || !allTeams.length) ? (
              <div className="text-muted-foreground text-center py-8">Loading chart data…</div>
            ) : (
              <ErrorBoundary fallback={<div className="text-center p-8 text-gray-500">Error loading chart. Please try again later.</div>}>
                <PowerScoreScatterPlot data={
                  allTeams
                    .filter((t: any) => {
                      return t && 
                            typeof t === 'object' && 
                            t.power_score !== null && 
                            t.power_score !== undefined && 
                            t.sos !== null && 
                            t.sos !== undefined;
                    })
                    .map((t: any) => ({
                      ...t,
                      division: t.division || t.divisionName || t.division_id || "Unassigned"
                    }))
                } />
              </ErrorBoundary>
            )}
          </div>
        </>
      ) : (
        <NoTeamsAvailable />
      )}
    </div>
  );
};

const ErrorBoundary = ({ children, fallback }: { children: React.ReactNode, fallback: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      console.error("Caught error:", error);
      setHasError(true);
    };
    
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);
  
  if (hasError) {
    return <>{fallback}</>;
  }
  
  try {
    return <>{children}</>;
  } catch (error) {
    console.error("Error in component:", error);
    return <>{fallback}</>;
  }
};

const NoTeamsAvailable = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No Teams Available</CardTitle>
        <CardDescription>There are no teams in the selected division or no teams have been added yet.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Try selecting a different division or add teams to view statistics.</p>
      </CardContent>
    </Card>
  );
};

export default StatsContainer;

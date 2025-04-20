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
  const { top10, allTeams, isLoadingTop, isLoadingAll } = usePowerScoresData();

  // Process top teams data for display in charts
  const topTeams = (top10.length > 0 ? top10 : rankings)
    .filter((team: any) => {
      const powerScore = team.power_score !== undefined ? team.power_score : team.powerScore;
      return powerScore !== null && powerScore !== undefined;
    })
    .slice(0, 10);

  // Transform data for the chart component that expects Ranking[]
  const topTeamsForCharts = topTeams.map((team: any) => {
    // If it's already a Ranking type, return it as is
    if (team.teamId) return team as Ranking;
    
    // Otherwise convert from API data format
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
  });

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
              <CompactStandings rankings={topTeamsForCharts} />
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
            chartData={topTeamsForCharts.slice(0, chartLimit)} 
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
              <PowerScoreScatterPlot data={
                allTeams
                  .filter((t: any) => t.power_score !== null && t.sos !== null)
                  .map((t: any) => ({
                    ...t,
                    division: t.division || t.divisionName || t.division_id || "Unassigned"
                  }))
              } />
            )}
          </div>
        </>
      ) : (
        <NoTeamsAvailable />
      )}
    </div>
  );
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

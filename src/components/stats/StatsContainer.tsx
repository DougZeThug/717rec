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

  const topTeamsData = (top10.length > 0 ? top10 : rankings)
    .filter(team => team.power_score !== null && team.power_score !== undefined)
    .slice(0, 10) // True top 10
    .map(team => ({
      id: team.team_id || team.teamId || team.id,
      name: team.team_name || team.teamName || team.name,
      wins: team.wins,
      losses: team.losses,
      winPercentage: Number((team.win_percentage ?? team.winPercentage ?? 0) * 100).toFixed(1),
      powerScore: team.power_score || team.powerScore || 0,
      sos: Number((team.sos || 0).toFixed(3)),
      logoUrl: team.logo_url || team.logoUrl,
      imageUrl: team.image_url || team.imageUrl,
      divisionName: team.division || team.divisionName || undefined
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
              <CompactStandings rankings={topTeamsData} />
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
            chartData={topTeamsData.slice(0, chartLimit)} 
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

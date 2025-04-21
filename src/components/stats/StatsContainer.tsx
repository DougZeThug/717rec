
import React, { useRef, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useTeamData } from "@/hooks/useTeamData";
import { useDivisions } from "@/hooks/useDivisions";
import { Match, Ranking } from "@/types"; // Added Ranking import
import { useTeamRankings } from "@/hooks/useTeamRankings";
import StatsHeader from "@/components/stats/StatsHeader";
import StatsSummaryCards from "@/components/stats/StatsSummaryCards";
import StatsLoadingState from "./StatsLoadingState";
import StatsErrorState from "./StatsErrorState";
import FullRankings from "./FullRankings";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePowerScoresData } from "@/hooks/power-score/usePowerScoresData";
import ErrorBoundary from "@/components/stats/ErrorBoundary";
import NoTeamsAvailable from "@/components/stats/NoTeamsAvailable";
import StandingsSection from "@/components/stats/StandingsSection";
import PowerScoreScatterPlot from "@/components/stats/PowerScoreScatterPlot"; // Added PowerScoreScatterPlot import

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

  const fullRankingsRef = React.useRef<HTMLDivElement>(null);
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
        logoUrl: team.logo_url || team.logoUrl || null,
        imageUrl: team.image_url || team.imageUrl || team.logo_url || null,
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

  console.log("topTeamsForRankings:", topTeamsForRankings);
  console.log("rankings (full):", rankings);

  return (
    <div className="max-w-7xl mx-auto">
      <StatsHeader 
        onDivisionChange={handleDivisionChange} 
        divisions={divisions || []} 
      />

      {isLoadingTop ? (
        <StatsLoadingState />
      ) : rankings.length > 0 ? (
        <>
          <StandingsSection 
            topTeamsForRankings={topTeamsForRankings}
            onViewFullStandings={scrollToFullRankings}
          />
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-cornhole-navy mb-4">League Highlights</h2>
            <StatsSummaryCards rankings={rankings} />
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

          <div ref={fullRankingsRef} id="rankings" className="scroll-mt-16 mb-8">
            <FullRankings rankings={rankings} />
          </div>
        </>
      ) : (
        <NoTeamsAvailable />
      )}
    </div>
  );
};

export default StatsContainer;

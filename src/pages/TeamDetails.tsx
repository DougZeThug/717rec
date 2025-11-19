
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { useTeamDetails } from "@/hooks/useTeamDetails";
import TeamHeader from "@/components/teams/TeamHeader";
import StatBreakdown from "@/components/teams/StatBreakdown";
import MatchList from "@/components/teams/MatchList";
import PlayerList from "@/components/teams/PlayerList";
import TeamBadgeCollection from "@/components/badges/TeamBadgeCollection";
import { useTeamMatches } from "@/hooks/useTeamMatches";
import { useTeamRankings } from "@/hooks/useTeamRankings";
import { Card } from "@/components/ui/card";
import HeadToHeadRecords from "@/components/stats/HeadToHeadRecords";
import TeamTotals from "@/components/teams/TeamTotals";
import { calculateSweepRate } from "@/utils/teamDetailsUtils/sweepRateUtils";
import TeamCareerPowerScoreChart from "@/components/teams/TeamCareerPowerScoreChart";

const TeamDetails = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  
  const { team, isLoading } = useTeamDetails(teamId);
  const { pastMatches, isLoadingMatches } = useTeamMatches(teamId);
  const { rankings } = useTeamRankings();
  
  const teamRanking = rankings?.find(r => r.teamId === teamId);
  const teamRank = teamRanking ? rankings.findIndex(r => r.teamId === teamId) + 1 : undefined;
  const totalTeams = rankings?.length;

  console.log("TeamDetails rendering with team data:", team ? {
    name: team.name,
    power_score: team.power_score,
    sos: team.sos,
    win_percentage: team.win_percentage || 0,
    game_win_percentage: team.game_win_percentage || 0
  } : "Loading team...");

  if (isLoading || isLoadingMatches) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-40 mb-4" />
        <Skeleton className="h-64 w-full rounded-lg mb-8" />
        <Skeleton className="h-8 w-60 mb-2" />
        <Skeleton className="h-24 w-full rounded-lg mb-4" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Team Not Found</h1>
        <p className="mb-4">The team you're looking for doesn't exist.</p>
        <Button onClick={() => navigate("/teams")}>Back to Teams</Button>
      </div>
    );
  }

  const winPct = team.win_percentage ? team.win_percentage * 100 : 0;
  const gamePct = team.game_win_percentage ? team.game_win_percentage * 100 : 0;
  const sweepStats = calculateSweepRate(teamId || '', pastMatches);

  return (
    <div className="container mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} className="mr-2" /> Back
      </Button>
      
      <TeamHeader team={team} winPercentage={winPct.toFixed(1)} />
      
      <StatBreakdown
        wins={team.wins}
        losses={team.losses}
        winPercentage={winPct.toFixed(1)}
        gamesWon={team.game_wins || 0}
        gamesLost={team.game_losses || 0}
        gameWinPercentage={gamePct.toFixed(1)}
        strengthOfSchedule={team.sos?.toFixed(3) || "0.000"}
        closeMatchLosses={team.close_match_losses || 0}
        powerScore={team.power_score || 0}
        rank={teamRank}
        totalTeams={totalTeams}
        rankChange={teamRanking?.rankChange}
        sweeps={sweepStats.sweeps}
        sweepRate={sweepStats.sweepRate}
      />

      {/* Career Power Score Trend Chart */}
      {teamId && <TeamCareerPowerScoreChart teamId={teamId} />}

      <PlayerList players={team.players || []} />
      
      {/* Head-to-Head Records Section */}
      {teamId && <HeadToHeadRecords teamId={teamId} />}
      
      {/* Team Career Statistics */}
      {teamId && <TeamTotals teamId={teamId} />}
      
      {/* Team Achievements Section - moved below PlayerList */}
      {teamId && (
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Team Achievements</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <TeamBadgeCollection
              teamId={teamId}
              size="lg"
              maxDisplay={12}
              orientation="horizontal"
              className="gap-3"
            />
          </div>
        </Card>
      )}
      
      <MatchList
        title="Match History"
        matches={pastMatches}
        isLoading={isLoadingMatches}
        teamId={teamId || ''}
        isPast={true}
        highlightWinnerLoser={true}
        collapsible={true}
        defaultOpen={false}
      />
    </div>
  );
};

export default TeamDetails;

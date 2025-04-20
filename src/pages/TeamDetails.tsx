
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { useTeamDetails } from "@/hooks/useTeamDetails";
import TeamHeader from "@/components/teams/TeamHeader";
import TeamStats from "@/components/teams/TeamStats";
import MatchList from "@/components/teams/MatchList";
import StatBreakdown from "@/components/teams/StatBreakdown";
import { useTeamMatches } from "@/hooks/useTeamMatches";

const TeamDetails = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  
  const { team, isLoading } = useTeamDetails(teamId);
  const { upcomingMatches, pastMatches, isLoadingMatches } = useTeamMatches(teamId);

  // Log team data to verify we're using the correct values
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

  // Use values directly from v_team_details instead of calculating
  const winPct = team.win_percentage ? team.win_percentage * 100 : 0;
  const gamePct = team.game_win_percentage ? team.game_win_percentage * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} className="mr-2" /> Back
      </Button>
      
      {/* Team Header */}
      <TeamHeader team={team} winPercentage={winPct.toFixed(1)} />
      
      {/* Team Stats */}
      <TeamStats 
        wins={team.wins}
        losses={team.losses}
        gameWins={team.game_wins}
        gameLosses={team.game_losses}
        winPercentage={winPct.toFixed(1) + "%"}
        gameWinPercentage={gamePct.toFixed(1) + "%"}
        sos={team.sos}
        closeMatchLosses={team.close_match_losses}
        powerScore={team.power_score}
      />
      
      {/* Stat Breakdown */}
      <StatBreakdown
        wins={team.wins}
        losses={team.losses}
        winPercentage={winPct.toFixed(1)}
        gamesWon={team.game_wins}
        gamesLost={team.game_losses}
        gameWinPercentage={gamePct.toFixed(1)}
        strengthOfSchedule={team.sos?.toString() || "0.0"}
        closeMatchLosses={team.close_match_losses || 0}
        powerScore={team.power_score || 0}
      />
      
      {/* Upcoming Matches */}
      <MatchList
        title="Upcoming Matches"
        matches={upcomingMatches}
        isLoading={isLoadingMatches}
        teamId={teamId || ''}
      />
      
      {/* Past Matches */}
      <MatchList
        title="Past Matches"
        matches={pastMatches}
        isLoading={isLoadingMatches}
        teamId={teamId || ''}
        isPast={true}
      />
    </div>
  );
};

export default TeamDetails;

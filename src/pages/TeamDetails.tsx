
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { useTeamDetails } from "@/hooks/useTeamDetails";
import TeamHeader from "@/components/teams/TeamHeader";
import StatBreakdown from "@/components/teams/StatBreakdown";
import MatchList from "@/components/teams/MatchList";
import PlayerList from "@/components/teams/PlayerList";
import { useTeamMatches } from "@/hooks/useTeamMatches";
import { useTeamRankings } from "@/hooks/useTeamRankings";

// Define the extended Error interface for Supabase errors
interface SupabaseError extends Error {
  code?: string;
  hint?: string;
  details?: any;
}

const TeamDetails = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  
  const { team, isLoading } = useTeamDetails(teamId);
  const { pastMatches, upcomingMatches, isLoadingMatches, error: matchesError } = useTeamMatches(teamId);
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

  console.log("Match data status:", {
    pastMatches: pastMatches?.length || 0,
    upcomingMatches: upcomingMatches?.length || 0,
    isLoadingMatches,
    hasError: !!matchesError,
    errorDetails: matchesError ? {
      message: matchesError.message,
      code: (matchesError as SupabaseError).code,
      hint: (matchesError as SupabaseError).hint,
      details: (matchesError as SupabaseError).details
    } : "No error details",
    sampleMatch: pastMatches?.length > 0 ? {
      id: pastMatches[0].id,
      iscompleted: pastMatches[0].iscompleted ?? false,
      hasStats: Boolean(pastMatches[0].stats),
      statsSample: pastMatches[0].stats?.length > 0 ? 
        JSON.stringify(pastMatches[0].stats[0]).substring(0, 100) : "No stats"
    } : "No matches"
  });

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
        gamesWon={team.game_wins}
        gamesLost={team.game_losses}
        gameWinPercentage={gamePct.toFixed(1)}
        strengthOfSchedule={team.sos?.toFixed(3) || "0.000"}
        closeMatchLosses={team.close_match_losses || 0}
        powerScore={team.power_score || 0}
        rank={teamRank}
        totalTeams={totalTeams}
        rankChange={teamRanking?.rankChange}
      />

      <PlayerList players={team.players || []} />
      
      <MatchList
        title="Match History"
        matches={pastMatches}
        isLoading={isLoadingMatches}
        teamId={teamId || ''}
        isPast={true}
        error={matchesError}
      />
    </div>
  );
};

export default TeamDetails;

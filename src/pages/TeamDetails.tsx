
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { useTeamDetails } from "@/hooks/useTeamDetails";
import TeamHeader from "@/components/teams/TeamHeader";
import TeamStats from "@/components/teams/TeamStats";
import MatchList from "@/components/teams/MatchList";
import StatBreakdown from "@/components/teams/StatBreakdown";
import { useTeamMatches } from "@/hooks/useTeamMatches"; // This hook should already exist

const TeamDetails = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  
  const { team, isLoading } = useTeamDetails(teamId);
  const { upcomingMatches, pastMatches, isLoadingMatches } = useTeamMatches(teamId);

  // Derived values (guard against undefined)
  const wins = team?.wins ?? 0;
  const losses = team?.losses ?? 0;
  const gameWins = team?.game_wins ?? 0;
  const gameLosses = team?.game_losses ?? 0;

  const winPct = wins + losses === 0 ? 0 : (wins / (wins + losses)) * 100;
  const gamePct = gameWins + gameLosses === 0 ? 0 : (gameWins / (gameWins + gameLosses)) * 100;

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
        team={team}
        wins={wins}
        losses={losses}
        gameWins={gameWins}
        gameLosses={gameLosses}
        winPercentage={winPct.toFixed(1)}
        gameWinPercentage={gamePct.toFixed(1)}
      />
      
      {/* Stat Breakdown */}
      <StatBreakdown
        wins={wins}
        losses={losses}
        winPercentage={winPct.toFixed(1)}
        gamesWon={gameWins}
        gamesLost={gameLosses}
        gameWinPercentage={gamePct.toFixed(1)}
        strengthOfSchedule={team.sos || "0.0"}
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

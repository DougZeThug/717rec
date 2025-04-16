
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { useTeamDetails } from "@/hooks/useTeamDetails";
import TeamHeader from "@/components/teams/TeamHeader";
import TeamStats from "@/components/teams/TeamStats";
import MatchList from "@/components/teams/MatchList";

const TeamDetails = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  
  const {
    team,
    isLoadingTeam,
    isLoadingMatches,
    upcomingMatches,
    pastMatches,
    winPercentage,
    getOpponentId,
    getMatchResult,
    getScoreDisplay
  } = useTeamDetails(teamId);

  if (isLoadingTeam) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-40 mb-4" />
        <Skeleton className="h-64 w-full rounded-lg mb-8" />
        <Skeleton className="h-8 w-60 mb-2" />
        <Skeleton className="h-24 w-full rounded-lg mb-4" />
        <Skeleton className="h-8 w-60 mb-2" />
        <Skeleton className="h-48 w-full rounded-lg" />
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
      <TeamHeader team={team} winPercentage={winPercentage} />
      
      {/* Team Stats */}
      <TeamStats team={team} winPercentage={winPercentage} />
      
      {/* Upcoming Matches */}
      <MatchList
        title="Upcoming Matches"
        matches={upcomingMatches}
        isLoading={isLoadingMatches}
        teamId={teamId || ''}
        getOpponentId={getOpponentId}
      />
      
      {/* Past Matches */}
      <MatchList
        title="Past Matches"
        matches={pastMatches}
        isLoading={isLoadingMatches}
        teamId={teamId || ''}
        isPast={true}
        getOpponentId={getOpponentId}
        getMatchResult={getMatchResult}
        getScoreDisplay={getScoreDisplay}
      />
    </div>
  );
};

export default TeamDetails;

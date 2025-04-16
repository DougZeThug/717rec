
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Team, Match } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy, Calendar, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const TeamDetails = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  
  // Fetch team details
  const { data: team, isLoading: isLoadingTeam } = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      
      const { data, error } = await supabase
        .from("teams")
        .select("*, divisions(name)")
        .eq("id", teamId)
        .single();
        
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        logoUrl: data.logo_url,
        imageUrl: data.image_url,
        players: data.players?.map((name: string) => ({ name })) || [],
        wins: data.wins || 0,
        losses: data.losses || 0,
        created_at: data.created_at,
        division: data.division_id,
        divisionName: data.divisions?.name || null
      } as Team;
    },
    enabled: !!teamId
  });
  
  // Fetch matches for this team
  const { data: matches, isLoading: isLoadingMatches } = useQuery({
    queryKey: ["team-matches", teamId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`);
        
      if (error) throw error;
      
      return data.map((match: any): Match => ({
        id: match.id,
        team1Id: match.team1_id,
        team2Id: match.team2_id,
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        date: match.date || new Date().toISOString(), // Fallback if date is missing
        location: match.location || "",
        iscompleted: match.is_completed || false,
        winnerId: match.winner_id,
        loserId: match.loser_id
      }));
    },
    enabled: !!teamId
  });
  
  // Separate upcoming and past matches
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day
  
  const upcomingMatches = matches?.filter(
    match => new Date(match.date) >= today
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];
  
  const pastMatches = matches?.filter(
    match => new Date(match.date) < today
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
  
  // Calculate win percentage
  const totalGames = team ? team.wins + team.losses : 0;
  const winPercentage = totalGames > 0 ? ((team?.wins || 0) / totalGames * 100).toFixed(1) : "0.0";
  
  // For displaying opponents
  const getOpponentId = (match: Match) => {
    return match.team1Id === teamId ? match.team2Id : match.team1Id;
  };
  
  // Match result functions for past matches
  const getMatchResult = (match: Match) => {
    if (!match.iscompleted) return "Incomplete";
    return match.winnerId === teamId ? "Win" : "Loss";
  };
  
  const getScoreDisplay = (match: Match) => {
    if (!match.iscompleted || match.team1Score === undefined || match.team2Score === undefined) {
      return "";
    }
    
    // If this team is team1, show scores as is, otherwise swap
    if (match.team1Id === teamId) {
      return `${match.team1Score}–${match.team2Score}`;
    } else {
      return `${match.team2Score}–${match.team1Score}`;
    }
  };

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
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
          {team.imageUrl ? (
            <img 
              src={team.imageUrl} 
              alt={team.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No Logo
            </div>
          )}
        </div>
        
        <div>
          <h1 className="text-3xl font-bold">{team.name}</h1>
          
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {team.divisionName && (
              <Badge variant="outline" className="font-medium">
                {team.divisionName}
              </Badge>
            )}
            
            <div className="flex items-center text-emerald-600 font-semibold">
              <Trophy size={16} className="mr-1" /> 
              {team.wins} Wins
            </div>
            
            <div className="flex items-center text-rose-600 font-semibold">
              <X size={16} className="mr-1" /> 
              {team.losses} Losses
            </div>
            
            <div className="font-semibold">
              {winPercentage}% Win Rate
            </div>
          </div>
        </div>
      </div>
      
      {/* Team Stats */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Team Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{team.wins}</div>
              <div className="text-sm text-gray-500">Wins</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{team.losses}</div>
              <div className="text-sm text-gray-500">Losses</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{winPercentage}%</div>
              <div className="text-sm text-gray-500">Win Percentage</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">TBD</div>
              <div className="text-sm text-gray-500">Strength of Schedule</div>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Players</h3>
            <div className="flex flex-wrap gap-2">
              {team.players && team.players.length > 0 ? (
                team.players.map((player, index) => (
                  <Badge key={index} variant="secondary">
                    {player.name}
                  </Badge>
                ))
              ) : (
                <span className="text-gray-500">No players listed</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Upcoming Matches */}
      <h2 className="text-2xl font-bold mb-4">Upcoming Matches</h2>
      {isLoadingMatches ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : upcomingMatches.length > 0 ? (
        <div className="space-y-4 mb-8">
          {upcomingMatches.map(match => (
            <Card key={match.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar size={16} className="mr-2 text-gray-500" />
                    <span>
                      {format(new Date(match.date), "MMM d, yyyy")} at{" "}
                      {format(new Date(match.date), "h:mm a")}
                    </span>
                  </div>
                  <Badge variant="outline">Upcoming</Badge>
                </div>
                <div className="mt-2">
                  <span className="font-semibold">
                    Opponent: <span className="text-cornhole-navy">{getOpponentId(match)}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 mb-8">No upcoming matches scheduled.</p>
      )}
      
      {/* Past Matches */}
      <h2 className="text-2xl font-bold mb-4">Past Matches</h2>
      {isLoadingMatches ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : pastMatches.length > 0 ? (
        <div className="space-y-4">
          {pastMatches.map(match => (
            <Card key={match.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar size={16} className="mr-2 text-gray-500" />
                    <span>{format(new Date(match.date), "MMM d, yyyy")}</span>
                  </div>
                  <Badge 
                    variant={match.winnerId === teamId ? "default" : "destructive"}
                  >
                    {getMatchResult(match)}
                  </Badge>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="font-semibold">
                    Opponent: <span className="text-cornhole-navy">{getOpponentId(match)}</span>
                  </span>
                  {match.iscompleted && (
                    <span className="font-bold">{getScoreDisplay(match)}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No past matches found.</p>
      )}
    </div>
  );
};

export default TeamDetails;

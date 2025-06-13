
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import MatchCard from "./MatchCard";
import RecentMatchesSkeleton from "./RecentMatchesSkeleton";
import { Match } from "@/types";

const RecentMatches: React.FC = () => {
  const { data: matches, isLoading } = useQuery({
    queryKey: ['recent-matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(id, name, logo_url),
          team2:teams!matches_team2_id_fkey(id, name, logo_url)
        `)
        .eq('iscompleted', true)
        .order('date', { ascending: false })
        .limit(6);

      if (error) throw error;
      
      // Transform database response to Match type
      return data?.map((match): Match => ({
        id: match.id,
        team1Id: match.team1_id || '',
        team2Id: match.team2_id || '',
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        date: match.date || match.created_at,
        location: match.location || '',
        iscompleted: match.iscompleted || false,
        winnerId: match.winner_id,
        loserId: match.loser_id,
        round_number: match.round_number,
        position: match.position,
        bracket_id: match.bracket_id,
        match_type: match.match_type,
        next_match_id: match.next_match_id,
        next_loser_match_id: match.next_loser_match_id,
        best_of: match.best_of,
        team1_game_wins: match.team1_game_wins,
        team2_game_wins: match.team2_game_wins,
        team1Details: match.team1 ? {
          id: match.team1.id, // Add the required id property
          team_id: match.team1.id,
          name: match.team1.name,
          image_url: null,
          logo_url: match.team1.logo_url,
          divisionName: null
        } : null,
        team2Details: match.team2 ? {
          id: match.team2.id, // Add the required id property
          team_id: match.team2.id,
          name: match.team2.name,
          image_url: null,
          logo_url: match.team2.logo_url,
          divisionName: null
        } : null
      })) || [];
    }
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d');
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  if (isLoading) {
    return <RecentMatchesSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Match Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches?.map((match) => {
            if (!match.team1Details || !match.team2Details) return null;
            
            return (
              <MatchCard 
                key={match.id} 
                match={match} 
                team1={match.team1Details} 
                team2={match.team2Details} 
                formatDate={formatDate} 
                formatTime={formatTime}
              />
            );
          })}
        </div>
        {(!matches || matches.length === 0) && (
          <div className="text-center text-muted-foreground py-8">
            No recent matches to display
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentMatches;

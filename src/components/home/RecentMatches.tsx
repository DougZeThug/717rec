
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import MatchCard from "./MatchCard";
import RecentMatchesSkeleton from "./RecentMatchesSkeleton";

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
      return data || [];
    }
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d');
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const getTeamById = (id: string) => {
    // This would normally come from a teams query, but for now we'll use the embedded data
    return undefined;
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
            if (!match.team1 || !match.team2) return null;
            
            return (
              <MatchCard 
                key={match.id} 
                match={match} 
                team1={match.team1} 
                team2={match.team2} 
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

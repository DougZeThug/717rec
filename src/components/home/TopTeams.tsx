
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";
import TeamCard from "./TeamCard";

const TopTeams: React.FC = () => {
  const { data: teams, isLoading } = useQuery({
    queryKey: ['top-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_team_details')
        .select('*')
        .order('power_score', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Top Teams
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Top Teams
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {teams?.map((team, index) => (
            <TeamCard key={team.team_id} team={team} rank={index + 1} />
          ))}
          {(!teams || teams.length === 0) && (
            <div className="text-center text-muted-foreground py-4">
              No team rankings available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TopTeams;


import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";
import TeamCard from "./TeamCard";
import { Team } from "@/types";

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
      
      // Transform database response to Team type
      return data?.map((team): Team => ({
        id: team.team_id || '',
        name: team.name || '',
        wins: team.wins || 0,
        losses: team.losses || 0,
        game_wins: team.game_wins || 0,
        game_losses: team.game_losses || 0,
        divisionName: team.divisionname,
        division_id: team.division_id,
        imageUrl: team.image_url,
        logoUrl: team.logo_url,
        players: team.players || [],
        power_score: team.power_score || 0,
        sos: team.sos || 0,
        win_percentage: team.win_percentage || 0,
        game_win_percentage: team.game_win_percentage || 0,
        created_at: team.created_at,
        close_match_losses: team.close_match_losses || 0
      })) || [];
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
            <div key={team.id} className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center bg-yellow-100 dark:bg-yellow-900 rounded-full text-sm font-bold text-yellow-700 dark:text-yellow-300">
                {index + 1}
              </div>
              <div className="flex-1">
                <TeamCard team={team} />
              </div>
            </div>
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

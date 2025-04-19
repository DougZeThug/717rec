
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Team } from '@/types';

export function useTeamFetching() {
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_team_details')
        .select('*')
        .order('name');

      if (error) throw error;
      
      const teamsMap: Record<string, Team> = {};
      data?.forEach(team => {
        teamsMap[team.team_id] = {
          id: team.team_id,
          name: team.name,
          logoUrl: team.logo_url,
          imageUrl: team.image_url || null,
          players: Array.isArray(team.players) ? team.players : [],
          wins: team.wins || 0,
          losses: team.losses || 0,
          game_wins: team.game_wins || 0,
          game_losses: team.game_losses || 0,
          created_at: team.created_at || new Date().toISOString(),  // Add default value
          division: team.division_id || null,
          divisionName: team.divisionname || null,
          sos: typeof team.sos === 'number' ? team.sos :
               typeof team.sos === 'string' ? parseFloat(team.sos) : 0,
          power_score: typeof team.power_score === 'number' ? team.power_score :
                      typeof team.power_score === 'string' ? parseFloat(team.power_score) : 0
        };
      });
      
      setTeams(teamsMap);
      console.log("Team data loaded with values:", data?.slice(0, 3).map(t => ({
        id: t.team_id, 
        name: t.name,
        sos: t.sos,
        power_score: t.power_score
      })));
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams with game statistics. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    teams,
    fetchTeams,
    isLoading
  };
}

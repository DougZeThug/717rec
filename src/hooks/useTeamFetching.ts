
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
        .from('v_team_game_totals')
        .select(`
          team_id,
          name, 
          wins,
          losses,
          game_wins,
          game_losses,
          logo_url,
          division_id,
          sos,
          power_score
        `)
        .order('name');

      if (error) throw error;
      
      const teamsMap: Record<string, Team> = {};
      data?.forEach(team => {
        teamsMap[team.team_id] = {
          id: team.team_id,
          name: team.name,
          logoUrl: team.logo_url,
          imageUrl: null, // Since image_url is not available in v_team_game_totals
          players: [],  // Initialize as empty string array
          wins: team.wins || 0,
          losses: team.losses || 0,
          game_wins: team.game_wins || 0,
          game_losses: team.game_losses || 0,
          created_at: '',
          division: team.division_id || null,
          divisionName: null,
          sos: team.sos || 0,
          power_score: team.power_score || 0
        };
      });
      
      setTeams(teamsMap);
      console.log("Team data loaded:", data?.map(t => ({
        id: t.team_id, 
        logo: t.logo_url, 
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

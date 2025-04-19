
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Team } from '@/types';

export function useTeamFetching() {
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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
          division_id
        `)
        .order('name');

      if (error) throw error;
      
      const teamsMap: Record<string, Team> = {};
      data?.forEach(team => {
        teamsMap[team.team_id] = {
          id: team.team_id,
          name: team.name,
          logoUrl: team.logo_url,
          imageUrl: null,
          players: [],
          wins: team.wins || 0,
          losses: team.losses || 0,
          game_wins: team.game_wins || 0,
          game_losses: team.game_losses || 0,
          created_at: '',
          division: team.division_id || null,
          divisionName: null
        };
      });
      
      setTeams(teamsMap);
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

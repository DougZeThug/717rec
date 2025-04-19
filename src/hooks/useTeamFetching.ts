
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
      
      // Check for duplicate teams
      const teamCounts: Record<string, number> = {};
      
      data?.forEach(team => {
        const teamId = team.team_id;
        teamCounts[teamId] = (teamCounts[teamId] || 0) + 1;
        
        // Only process each team once
        if (!teamsMap[teamId]) {
          teamsMap[teamId] = {
            id: teamId,
            name: team.name,
            logoUrl: team.logo_url,
            imageUrl: team.image_url || null,
            players: Array.isArray(team.players) ? team.players : [],
            wins: team.wins || 0,
            losses: team.losses || 0,
            game_wins: team.game_wins || 0,
            game_losses: team.game_losses || 0,
            created_at: team.created_at || new Date().toISOString(),
            division: team.division_id || null,
            divisionName: team.divisionname || null,
            sos: typeof team.sos === 'number' ? team.sos :
                 typeof team.sos === 'string' ? parseFloat(team.sos) : 0,
            power_score: typeof team.power_score === 'number' ? team.power_score :
                        typeof team.power_score === 'string' ? parseFloat(team.power_score) : 0
          };
        }
      });
      
      // Log any duplicates found
      const duplicates = Object.entries(teamCounts).filter(([_, count]) => count > 1);
      if (duplicates.length > 0) {
        console.warn(`Found ${duplicates.length} duplicated teams in the data:`, 
          duplicates.map(([id]) => data?.find(t => t.team_id === id)?.name));
      }
      
      setTeams(teamsMap);
      console.log(`Loaded ${Object.keys(teamsMap).length} unique teams from ${data?.length || 0} records`);
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

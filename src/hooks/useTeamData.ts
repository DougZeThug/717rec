
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

export const useTeamData = (divisionId?: string | null) => {
  const query = useQuery<Team[], Error>({
    queryKey: ['teams', divisionId],
    queryFn: async () => {
      let query = supabase
        .from('v_team_details') // Using v_team_details view for consistency
        .select(`
          team_id as id,
          name,
          logo_url,
          players,
          wins,
          losses,
          game_wins,
          game_losses,
          created_at,
          division_id,
          division_name,
          sos,
          power_score
        `)
        .order('name');
      
      if (divisionId) {
        query = query.eq('division_id', divisionId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching teams:', error);
        throw error;
      }
      
      const transformedTeams = (data || []).map((team): Team => ({
        id: team.id,
        name: team.name || 'Unnamed Team',
        logoUrl: team.logo_url || null,
        imageUrl: null,
        players: Array.isArray(team.players) ? team.players : [],
        wins: team.wins || 0,
        losses: team.losses || 0,
        game_wins: team.game_wins || 0,
        game_losses: team.game_losses || 0,
        created_at: team.created_at || new Date().toISOString(),
        division: team.division_id || null,
        divisionName: team.division_name || null,
        sos: typeof team.sos === 'number' ? team.sos : 0,
        power_score: typeof team.power_score === 'number' ? team.power_score : 0
      }));
      
      console.log("TeamData query result:", transformedTeams.map(t => ({
        id: t.id, 
        name: t.name, 
        sos: t.sos, 
        power_score: t.power_score
      })));
      
      return transformedTeams;
    },
    staleTime: 10000,
  });
  
  return query;
};

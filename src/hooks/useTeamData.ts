
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

export const useTeamData = (divisionId?: string | null) => {
  const query = useQuery<Team[], Error>({
    queryKey: ['teams', divisionId],
    queryFn: async () => {
      let query = supabase
        .from('v_team_details')
        .select('*')
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
        id: team.team_id,
        name: team.name || 'Unnamed Team',
        logoUrl: team.logo_url || null,
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
      }));
      
      // Log the number of unique team IDs to help debug any remaining duplicates
      const uniqueTeamIds = new Set(transformedTeams.map(t => t.id)).size;
      console.log(`TeamData query result: ${transformedTeams.length} teams, ${uniqueTeamIds} unique IDs`);
      
      return transformedTeams;
    },
    staleTime: 10000,
  });
  
  return query;
};

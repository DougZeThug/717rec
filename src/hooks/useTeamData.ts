
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

export const useTeamData = (divisionId?: string | null) => {
  const query = useQuery<Team[], Error>({
    queryKey: ['teams', divisionId],
    queryFn: async () => {
      let query = supabase
        .from('v_team_details') // Using v_team_details view for consistency
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
        imageUrl: team.image_url || null, // Make sure to include image_url
        players: Array.isArray(team.players) ? team.players : [],
        wins: team.wins || 0,
        losses: team.losses || 0,
        game_wins: team.game_wins || 0,
        game_losses: team.game_losses || 0,
        created_at: team.created_at || new Date().toISOString(),
        division: team.division_id || null,
        divisionName: team.divisionname || null, // Changed from division_name to divisionname
        sos: typeof team.sos === 'number' ? team.sos : 0,
        power_score: typeof team.power_score === 'number' ? team.power_score : 0
      }));
      
      console.log("TeamData query result:", transformedTeams.map(t => ({
        id: t.id, 
        name: t.name, 
        logoUrl: t.logoUrl,
        imageUrl: t.imageUrl,
        sos: t.sos, 
        power_score: t.power_score
      })));
      
      return transformedTeams;
    },
    staleTime: 10000,
  });
  
  return query;
};

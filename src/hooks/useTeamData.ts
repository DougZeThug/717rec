
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

export const useTeamData = (divisionId?: string | null) => {
  const query = useQuery<Team[], Error>({
    queryKey: ['teams', divisionId],
    queryFn: async () => {
      let query = supabase
        .from('teams')
        .select('*, divisions(name)')
        .order('name');
      
      // Apply division filter if provided
      if (divisionId) {
        query = query.eq('division_id', divisionId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching teams:', error);
        throw error;
      }
      
      // Transform and log the data for debugging
      return (data || []).map((team): Team => {
        console.log(`Team ${team.name} game stats:`, {
          game_wins: team.game_wins || 0,
          game_losses: team.game_losses || 0
        });
        
        return {
          id: team.id,
          name: team.name || 'Unnamed Team',
          logoUrl: team.logo_url || null,
          imageUrl: team.image_url || null,
          players: Array.isArray(team.players) 
            ? team.players.map((playerName: string) => ({ name: playerName })) 
            : [],
          wins: team.wins || 0,
          losses: team.losses || 0,
          game_wins: team.game_wins || 0,
          game_losses: team.game_losses || 0,
          created_at: team.created_at || new Date().toISOString(),
          division: team.division_id || null,
          divisionName: team.divisions?.name || null
        };
      });
    },
    staleTime: 60000, // Cache for 1 minute
  });
  
  return query;
};

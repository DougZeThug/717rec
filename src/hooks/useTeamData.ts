
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

export const useTeamData = (divisionId?: string | null) => {
  const query = useQuery<Team[], Error>({
    queryKey: ['teams', divisionId],
    queryFn: async () => {
      console.log("Fetching teams data with game stats...");
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
      const transformedTeams = (data || []).map((team): Team => {
        const gameWins = team.game_wins || 0;
        const gameLosses = team.game_losses || 0;
        
        console.log(`Team ${team.name} game stats:`, {
          game_wins: gameWins,
          game_losses: gameLosses
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
          game_wins: gameWins,
          game_losses: gameLosses,
          created_at: team.created_at || new Date().toISOString(),
          division: team.division_id || null,
          divisionName: team.divisions?.name || null
        };
      });
      
      console.log(`Loaded ${transformedTeams.length} teams with game stats`);
      return transformedTeams;
    },
    staleTime: 10000, // Cache for 10 seconds to ensure fresh data
  });
  
  return query;
};

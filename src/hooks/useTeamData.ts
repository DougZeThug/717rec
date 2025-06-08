
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

export const useTeamData = (divisionId?: string | null, includeHidden: boolean = false) => {
  const query = useQuery<Team[], Error>({
    queryKey: ['teams', divisionId, includeHidden],
    queryFn: async () => {
      let query = supabase
        .from('teams')
        .select(`
          id,
          name,
          logo_url,
          image_url,
          wins,
          losses,
          game_wins,
          game_losses,
          division_id,
          hidden,
          players,
          created_at,
          close_match_losses,
          divisions(name)
        `)
        .order('name');
      
      if (divisionId) {
        query = query.eq('division_id', divisionId);
      }

      // Filter out hidden teams unless explicitly requested
      if (!includeHidden) {
        query = query.eq('hidden', false);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching teams:', error);
        throw error;
      }
      
      // Enhanced logging to debug division assignments
      console.log("useTeamData - Teams with divisions:", data?.map(team => ({
        id: team.id,
        name: team.name,
        division_id: team.division_id,
        hidden: team.hidden
      })));
      
      return (data || []).map((team): Team => ({
        id: team.id,
        name: team.name || 'Unnamed Team',
        logoUrl: team.logo_url || null,
        imageUrl: team.image_url || null,
        players: Array.isArray(team.players) ? team.players : [],
        wins: team.wins || 0,
        losses: team.losses || 0,
        game_wins: team.game_wins || 0,
        game_losses: team.game_losses || 0,
        created_at: team.created_at || new Date().toISOString(),
        division_id: team.division_id || null,
        division: team.division_id || null,
        divisionName: (team.divisions as any)?.name || null,
        hidden: team.hidden || false,
        sos: 0.5, // Default SOS since view is not updated
        power_score: 0, // Default power score
        win_percentage: team.wins + team.losses > 0 ? team.wins / (team.wins + team.losses) : 0,
        game_win_percentage: team.game_wins + team.game_losses > 0 ? team.game_wins / (team.game_wins + team.game_losses) : 0,
        close_match_losses: team.close_match_losses || 0
      }));
    },
    staleTime: 10000,
  });
  
  return query;
};

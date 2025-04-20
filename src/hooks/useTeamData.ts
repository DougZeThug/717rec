
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

export const useTeamData = (divisionId?: string | null) => {
  const query = useQuery<Team[], Error>({
    queryKey: ['teams', divisionId],
    queryFn: async () => {
      let query = supabase
        .from('v_team_details')
        .select(`
          team_id,
          name,
          logo_url,
          image_url,
          wins,
          losses,
          game_wins,
          game_losses,
          division_id,
          divisionname,
          sos,
          power_score,
          win_percentage,
          game_win_percentage,
          players,
          created_at
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
      
      // Create a Map to store unique teams by ID
      const uniqueTeamsMap = new Map<string, any>();
      
      (data || []).forEach(team => {
        if (!uniqueTeamsMap.has(team.team_id)) {
          uniqueTeamsMap.set(team.team_id, team);
        }
      });
      
      const uniqueTeamsArray = Array.from(uniqueTeamsMap.values());
      
      // Log the data to verify values
      console.log("useTeamData query results:", uniqueTeamsArray.map(team => ({
        name: team.name,
        power_score: team.power_score,
        sos: team.sos,
        win_percentage: team.win_percentage,
        game_win_percentage: team.game_win_percentage
      })));
      
      return uniqueTeamsArray.map((team): Team => ({
        id: team.team_id,
        name: team.name || 'Unnamed Team',
        logoUrl: team.logo_url || null,
        imageUrl: team.image_url || null,
        players: Array.isArray(team.players) ? team.players : [],
        wins: team.wins || 0,
        losses: team.losses || 0,
        game_wins: team.game_wins || 0,
        game_losses: team.game_losses || 0,
        created_at: team.created_at || new Date().toISOString(),
        division: team.division_id || null,
        divisionName: team.divisionname || null,
        sos: team.sos ?? 0.5, // Default SOS to 0.5 for new teams
        power_score: team.power_score || 0,
        win_percentage: team.win_percentage || 0,
        game_win_percentage: team.game_win_percentage || 0
      }));
    },
    staleTime: 10000,
  });
  
  return query;
};

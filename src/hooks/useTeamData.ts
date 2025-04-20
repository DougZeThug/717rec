
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
      
      // Create a Map to store unique teams by ID
      const uniqueTeamsMap = new Map<string, any>();
      
      (data || []).forEach(team => {
        // Only add the team if it doesn't exist in our map already
        if (!uniqueTeamsMap.has(team.team_id)) {
          uniqueTeamsMap.set(team.team_id, team);
        }
      });
      
      // Convert the Map values back to an array
      const uniqueTeamsArray = Array.from(uniqueTeamsMap.values());
      
      // Log the data to verify values
      console.log("useTeamData query results:", uniqueTeamsArray.map(team => ({
        name: team.name,
        power_score: team.power_score,
        sos: team.sos,
        win_percentage: team.win_percentage,
        game_win_percentage: team.game_win_percentage
      })));
      
      const transformedTeams = uniqueTeamsArray.map((team): Team => ({
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
        sos: typeof team.sos === 'number' ? team.sos :
             typeof team.sos === 'string' ? parseFloat(team.sos) : 0,
        power_score: typeof team.power_score === 'number' ? team.power_score :
                    typeof team.power_score === 'string' ? parseFloat(team.power_score) : 0,
        win_percentage: typeof team.win_percentage === 'number' ? team.win_percentage :
                      typeof team.win_percentage === 'string' ? parseFloat(team.win_percentage) : 0,
        game_win_percentage: typeof team.game_win_percentage === 'number' ? team.game_win_percentage :
                            typeof team.game_win_percentage === 'string' ? parseFloat(team.game_win_percentage) : 0
      }));
      
      // Log the number of unique team IDs after deduplication
      console.log(`TeamData query result: ${data?.length || 0} total records, ${transformedTeams.length} unique teams`);
      
      return transformedTeams;
    },
    staleTime: 10000,
  });
  
  return query;
};

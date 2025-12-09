
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";
import { teamLog, errorLog } from "@/utils/logger";

export const useTeamData = (divisionId?: string | null, includeHidden?: boolean) => {
  const query = useQuery<Team[], Error>({
    queryKey: ['teams', divisionId, includeHidden],
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
          created_at,
          close_match_losses
        `)
        .order('name');
      
      if (divisionId) {
        query = query.eq('division_id', divisionId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        errorLog('Error fetching teams:', error);
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
      
      // Filter out teams from the "Hidden" division (unless includeHidden is true)
      const filteredTeams = includeHidden 
        ? uniqueTeamsArray 
        : uniqueTeamsArray.filter(team => team.divisionname !== 'Hidden');
      
      teamLog(`Loaded ${filteredTeams.length} of ${uniqueTeamsArray.length} teams (hidden filtered: ${!includeHidden})`);
      
      return filteredTeams.map((team): Team => ({
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
        division_id: team.division_id || null, // Keep division_id as is without renaming
        division: team.division_id || null, // Keep division for backward compatibility
        divisionName: team.divisionname || null,
        sos: typeof team.sos === 'number' ? team.sos : 0.5,
        power_score: typeof team.power_score === 'number' ? team.power_score : 0,
        win_percentage: team.win_percentage || 0,
        game_win_percentage: team.game_win_percentage || 0,
        close_match_losses: team.close_match_losses
      }));
    },
    staleTime: 10000,
  });
  
  return query;
};

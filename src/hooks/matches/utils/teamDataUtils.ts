
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

export const fetchTeamsForMatch = async (
  teamIds: string[]
): Promise<Team[]> => {
  try {
    console.log(`[teamDataUtils] Fetching teams for ids:`, teamIds);
    
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .in('id', teamIds);
      
    if (error) {
      console.error("[teamDataUtils] Error fetching team data:", error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.error("[teamDataUtils] No teams found for ids:", teamIds);
      return [];
    }
    
    console.log(`[teamDataUtils] Found ${data.length} teams`);
    
    // Transform to proper Team objects
    const formattedTeams: Team[] = data.map(team => ({
      id: team.id,
      name: team.name,
      logoUrl: team.logo_url || null,
      imageUrl: team.image_url || null,
      players: Array.isArray(team.players) ? team.players : [],
      wins: team.wins || 0,
      losses: team.losses || 0,
      game_wins: team.game_wins || 0,
      game_losses: team.game_losses || 0,
      created_at: team.created_at || '',
      division: team.division_id || null,
      divisionName: null
    }));
    
    return formattedTeams;
  } catch (error) {
    console.error("[teamDataUtils] Error in fetchTeamsForMatch:", error);
    throw error;
  }
};

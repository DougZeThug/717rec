
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

export const fetchTeamsFromApi = async (includeHidden: boolean = false) => {
  let query = supabase
    .from('teams')
    .select(`
      id,
      name,
      logo_url,
      image_url,
      players,
      wins,
      losses,
      game_wins,
      game_losses,
      created_at,
      division_id,
      hidden,
      divisions!inner(name)
    `)
    .order('name');

  // Filter out hidden teams unless explicitly requested
  if (!includeHidden) {
    query = query.eq('hidden', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }

  // Map data with proper type handling
  return (data || []).map((team: any): Team => ({
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
    divisionName: team.divisions?.name || null,
    hidden: team.hidden || false,
    // Calculate stats from the raw data since view is not updated
    sos: 0.5, // Default SOS
    power_score: 0, // Default power score
    win_percentage: team.wins + team.losses > 0 ? team.wins / (team.wins + team.losses) : 0,
    game_win_percentage: team.game_wins + team.game_losses > 0 ? team.game_wins / (team.game_wins + team.game_losses) : 0,
    close_match_losses: 0
  }));
};


import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

/**
 * Fetch all teams from the database
 */
export const fetchTeamsFromApi = async () => {
  const { data, error } = await supabase
    .from('v_team_details') // Using v_team_details view for consistency
    .select('*')
    .order('name');

  console.log("Teams fetched from API:", data?.map(t => ({
    id: t.team_id, 
    name: t.name,
    logoUrl: t.logo_url,
    imageUrl: t.image_url
  })));

  if (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }

  // Process the data to match our Team type, safely handling missing fields
  return (data || []).map((team: any): Team => ({
    id: team.team_id,
    name: team.name || 'Unnamed Team',
    logoUrl: team.logo_url || null,
    imageUrl: team.image_url || null, // Explicitly include image_url
    // Safely handle players array which might be null/undefined
    players: Array.isArray(team.players) ? team.players : [],
    // Default values for optional fields
    wins: team.wins || 0,
    losses: team.losses || 0,
    created_at: team.created_at || new Date().toISOString(),
    division: team.division_id || null,
    divisionName: team.divisionname || null,
    game_wins: team.game_wins || 0,
    game_losses: team.game_losses || 0,
    sos: typeof team.sos === 'number' ? team.sos : 0,
    power_score: typeof team.power_score === 'number' ? team.power_score : 0
  }));
};

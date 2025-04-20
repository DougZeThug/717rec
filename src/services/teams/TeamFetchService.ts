
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

export const fetchTeamsFromApi = async () => {
  const { data, error } = await supabase
    .from('v_team_details')
    .select('*')
    .order('name');

  // Log fetched data to verify values
  console.log("Teams data from v_team_details:", data?.map(t => ({
    id: t.team_id,
    name: t.name,
    sos: t.sos,
    power_score: t.power_score,
    win_percentage: t.win_percentage,
    game_win_percentage: t.game_win_percentage
  })));

  if (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }

  // Map data to Team type, using the correct field names from v_team_details
  return (data || []).map((team: any): Team => ({
    id: team.team_id,
    name: team.name || 'Unnamed Team',
    logoUrl: team.logo_url || null,
    imageUrl: team.image_url || null,
    players: Array.isArray(team.players) ? team.players : [],
    wins: team.wins || 0,
    losses: team.losses || 0,
    created_at: team.created_at || new Date().toISOString(),
    division: team.division_id || null,
    divisionName: team.divisionname || null,
    game_wins: team.game_wins || 0,
    game_losses: team.game_losses || 0,
    // Map the database-calculated values directly
    sos: team.sos || 0,
    power_score: team.power_score || 0,
    close_match_losses: team.close_match_losses || 0
  }));
};

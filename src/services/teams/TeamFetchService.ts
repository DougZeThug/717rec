
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

export const fetchTeamsFromApi = async () => {
  const { data, error } = await supabase
    .from('v_team_details')
    .select(`
      team_id,
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
      divisionname,
      sos,
      power_score,
      win_percentage,
      game_win_percentage
    `)
    .order('name');

  // Enhanced logging to verify values
  console.log("Teams fetched from v_team_details with full stats:", data?.map(t => ({
    name: t.name,
    power_score: t.power_score,
    sos: t.sos,
    win_percentage: t.win_percentage,
    game_win_percentage: t.game_win_percentage,
    wins: t.wins,
    losses: t.losses,
    game_wins: t.game_wins,
    game_losses: t.game_losses
  })));

  if (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }

  // Map data directly from v_team_details with proper defaults
  return (data || []).map((team: any): Team => ({
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
    // Take values directly from v_team_details with proper defaults
    sos: team.sos ?? 0.5, // Default SOS to 0.5 for new teams
    power_score: team.power_score || 0,
    win_percentage: team.win_percentage || 0,
    game_win_percentage: team.game_win_percentage || 0
  }));
};


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
      game_win_percentage,
      close_match_losses
    `)
    .order('name');

  // Enhanced logging to verify values
  if (data && data.length > 0) {
    console.log("SOS and Power Score sample from v_team_details:", data.slice(0, 3).map(t => ({
      name: t.name,
      power_score: t.power_score,
      sos: t.sos
    })));
  }

  if (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }

  // Map data directly from v_team_details with proper type handling
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
    sos: typeof team.sos === 'number' ? team.sos : 0.5,
    power_score: typeof team.power_score === 'number' ? team.power_score : 0,
    win_percentage: team.win_percentage || 0,
    game_win_percentage: team.game_win_percentage || 0,
    close_match_losses: team.close_match_losses
  }));
};

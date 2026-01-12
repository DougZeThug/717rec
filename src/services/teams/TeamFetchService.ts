import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/types';
import { dbLog } from '@/utils/logger';
import { transformTeamRow, TeamRowData } from '@/utils/teamTransformer';

export const fetchTeamsFromApi = async () => {
  const { data, error } = await supabase
    .from('v_team_details')
    .select(
      `
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
    `
    )
    .order('name');

  if (error) {
    dbLog('Error fetching teams:', error);
    throw error;
  }

  // Transform data using the centralized teamTransformer utility
  // The power_score and sos are calculated correctly in the database using the 40/45/15 formula
  return (data || []).map((team) => transformTeamRow(team as TeamRowData));
};

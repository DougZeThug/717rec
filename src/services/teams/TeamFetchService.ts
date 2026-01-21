import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/types';
import { handleDatabaseError } from '@/utils/errorHandler';
import { transformTeamRow, TeamRowData } from '@/utils/teamTransformer';

/**
 * Fetch all teams from the database
 * @throws {DatabaseError} When database operations fail
 */
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
    handleDatabaseError(error, 'Failed to fetch teams');
  }

  // Transform data using the centralized teamTransformer utility
  // The power_score and sos are calculated correctly in the database using the 40/45/15 formula
  return (data || []).map((team) => transformTeamRow(team as TeamRowData));
};

import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

/**
 * Fetch final standings for a completed bracket
 * Used by FinalStandings component
 */
export const fetchFinalStandings = async (bracketId: string) => {
  const { data, error } = await supabase
    .from('playoff_team_records')
    .select(
      `
      placement,
      wins,
      losses,
      game_wins,
      game_losses,
      teams:team_id (
        id,
        name,
        logo_url,
        image_url
      )
    `
    )
    .eq('bracket_id', bracketId)
    .not('placement', 'is', null)
    .order('placement', { ascending: true });

  if (error) {
    handleDatabaseError(error, 'Failed to fetch final standings');
  }

  return data;
};

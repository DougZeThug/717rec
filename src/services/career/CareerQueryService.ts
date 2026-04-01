import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

/**
 * Service layer for career-related database queries.
 * Used by calculateCareerPowerScore when data is not pre-fetched.
 */

export const CareerQueryService = {
  /**
   * Fetch team season power scores from team_season_stats
   */
  fetchTeamSeasonPowerScores: async (teamId: string) => {
    const { data, error } = await supabase
      .from('team_season_stats')
      .select('power_score, match_wins, match_losses, season_id')
      .eq('team_id', teamId)
      .not('power_score', 'is', null);

    if (error) handleDatabaseError(error, 'Failed to fetch team season power scores');
    return data ?? [];
  },

  /**
   * Fetch current season team power data from v_team_details
   */
  fetchCurrentTeamPower: async (teamId: string) => {
    const { data, error } = await supabase
      .from('v_team_details')
      .select('power_score, wins, losses')
      .eq('team_id', teamId)
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to fetch current team power');
    return data;
  },

  /**
   * Fetch the active season ID
   */
  fetchActiveSeasonId: async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to fetch active season');
    return data?.id ?? null;
  },
};

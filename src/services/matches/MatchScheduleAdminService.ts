import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { createEveningAwareDateRange } from '@/utils/timezone';

/**
 * Service layer for schedule and admin match operations
 */

/**
 * Fetch matches for admin with evening-aware date range filtering
 * @throws raw Supabase error on failure
 */
export const fetchMatchesForAdmin = async (filters: { date?: Date; bracketId?: string }) => {
  let query = supabase
    .from('matches')
    .select(
      `
      *,
      team1:teams!matches_team1_id_fkey(id, name, logo_url, image_url),
      team2:teams!matches_team2_id_fkey(id, name, logo_url, image_url)
    `
    )
    .order('date', { ascending: true });

  if (filters.date) {
    const { startDate, endDate } = createEveningAwareDateRange(filters.date);
    query = query.gte('date', startDate.toISOString()).lte('date', endDate.toISOString());
  }

  if (filters.bracketId) {
    query = query.eq('bracket_id', filters.bracketId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Fetch schedule matches for the active season with v_team_details join.
 * Used by useScheduleData hook.
 * @throws {DatabaseError} When database operations fail
 */
export const fetchScheduleMatches = async () => {
  // First get the active season
  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single();

  if (!activeSeason) return [];

  const { data, error } = await supabase
    .from('matches')
    .select(
      `
      *,
      team1:v_team_details!team1_id(
        team_id,
        name,
        image_url,
        logo_url,
        divisionname,
        division_id,
        power_score,
        sos
      ),
      team2:v_team_details!team2_id(
        team_id,
        name,
        image_url,
        logo_url,
        divisionname,
        division_id,
        power_score,
        sos
      )
    `
    )
    .eq('season_id', activeSeason.id)
    .order('date');

  if (error) handleDatabaseError(error, 'Failed to fetch schedule matches');
  return data ?? [];
};

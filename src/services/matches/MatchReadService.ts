import { supabase } from '@/integrations/supabase/client';
import { dbLog } from '@/utils/logger';

/**
 * Service layer for match read operations
 * Abstracts Supabase queries from presentation components
 */

export interface MatchFilters {
  date?: Date;
  bracketId?: string;
}

/**
 * Fetch matches with team details, optionally filtered by date and/or bracket
 */
export const fetchMatchesWithTeams = async (filters?: MatchFilters) => {
  let query = supabase
    .from('matches')
    .select(
      `
        *,
        team1:teams!matches_team1_id_fkey(id, name, logo_url),
        team2:teams!matches_team2_id_fkey(id, name, logo_url)
      `
    )
    .order('date', { ascending: true });

  // Apply date filter if provided
  if (filters?.date) {
    const dateStr = filters.date.toISOString().split('T')[0]; // Format as yyyy-MM-dd
    query = query.gte('date', `${dateStr}T00:00:00`).lt('date', `${dateStr}T23:59:59`);
  }

  // Apply bracket filter if provided
  if (filters?.bracketId) {
    query = query.eq('bracket_id', filters.bracketId);
  }

  const { data, error } = await query;

  if (error) {
    dbLog('Error fetching matches with teams:', error);
    throw error;
  }

  return data || [];
};

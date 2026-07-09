import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

/**
 * Returns the subset of the given match IDs that have at least one row in the
 * `games` table (i.e. were scored via live scoring, not the traditional admin
 * mass-entry flow). Used to gate the "View match recap" CTA on the schedule.
 */
export const LiveScoredMatchesService = {
  fetchLiveScoredMatchIds: async (matchIds: string[]): Promise<Set<string>> => {
    if (matchIds.length === 0) return new Set<string>();

    const { data, error } = await supabase
      .from('games')
      .select('match_id')
      .in('match_id', matchIds);

    if (error) handleDatabaseError(error, 'Failed to fetch live-scored match ids');

    const ids = new Set<string>();
    for (const row of data ?? []) {
      if (row.match_id) ids.add(row.match_id);
    }
    return ids;
  },
};

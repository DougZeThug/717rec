import { supabase } from '@/integrations/supabase/client';
import { matchLog } from '@/utils/logger';
import { createEveningAwareDateRange } from '@/utils/timezone';

import { FilterState } from '../types';

export const buildMatchQuery = (filters: FilterState) => {
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

  if (filters.date) {
    // Use the evening-aware date range for more intuitive filtering
    const { startDate, endDate } = createEveningAwareDateRange(filters.date);

    matchLog(`Filtering matches with evening-aware date range:`, {
      date: filters.date.toDateString(),
      startDateUTC: startDate.toISOString(),
      endDateUTC: endDate.toISOString(),
    });

    // Use the extended date range that includes evening matches
    query = query.gte('date', startDate.toISOString()).lte('date', endDate.toISOString());
  }

  if (filters.bracketId) {
    query = query.eq('bracket_id', filters.bracketId);
  }

  return query;
};

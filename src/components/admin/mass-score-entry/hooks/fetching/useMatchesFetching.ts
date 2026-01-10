import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { errorLog, matchLog } from '@/utils/logger';
import { createEveningAwareDateRange } from '@/utils/timezone';

import { FilterState, MatchWithTeams } from '../../types';
import { transformDatabaseMatchToMatchWithTeams } from '../../utils/matchTransformUtils';

export const useMatchesFetching = () => {
  const { toast } = useToast();

  const fetchMatches = async (filters: FilterState) => {
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

      matchLog(`Fetching matches with evening-aware date range:`, {
        date: filters.date.toDateString(),
        startDateUTC: startDate.toISOString(),
        endDateUTC: endDate.toISOString(),
      });

      query = query.gte('date', startDate.toISOString()).lte('date', endDate.toISOString());
    }

    if (filters.bracketId) {
      query = query.eq('bracket_id', filters.bracketId);
    }

    try {
      const { data, error } = await query;
      if (error) throw error;

      return data.map(transformDatabaseMatchToMatchWithTeams) as MatchWithTeams[];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error fetching matches:', message);
      toast({
        title: 'Error',
        description: `Failed to fetch matches: ${message}`,
        variant: 'destructive',
      });
      return [];
    }
  };

  return { fetchMatches };
};

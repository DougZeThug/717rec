import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { Match } from '@/types';
import { transformDatabaseMatches } from '@/utils/matchTransformers';

export const useRankingsData = () => {
  const queryClient = useQueryClient();

  const {
    data: latestMatches,
    isLoading: matchesLoading,
    error,
  } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      return transformDatabaseMatches(data, { normalizeDate: false });
    },
    staleTime: 1000 * 60 * 3, // 3 minutes - rankings only update after match completions
  });

  return {
    latestMatches,
    matchesLoading,
    matchesError: error as Error | null,
  };
};

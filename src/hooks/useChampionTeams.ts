import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';

interface ChampionTeam {
  id: string;
  name: string;
  image_url: string | null;
}

interface UseChampionTeamsResult {
  teams: ChampionTeam[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch champion teams by their IDs
 * Used for displaying champion cards with minimal data
 */
export const useChampionTeams = (teamIds: string[]): UseQueryResult<ChampionTeam[], Error> => {
  return useQuery({
    queryKey: ['champion-teams', teamIds],
    queryFn: async () => {
      if (teamIds.length === 0) return [];

      const { data, error } = await supabase
        .from('teams')
        .select('id, name, image_url')
        .in('id', teamIds);

      if (error) throw error;

      return (data || []) as ChampionTeam[];
    },
    enabled: teamIds.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes - champion data rarely changes
  });
};

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
    queryKey: ['matches', 'rankings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(
          'id, team1_id, team2_id, team1_score, team2_score, date, location, iscompleted, winner_id, loser_id, round_number, position, bracket_id, match_type, next_match_id, next_loser_match_id, best_of, team1_game_wins, team2_game_wins, created_at'
        )
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

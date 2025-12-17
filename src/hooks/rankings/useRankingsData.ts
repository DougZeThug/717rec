
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Match } from "@/types";

export const useRankingsData = () => {
  const queryClient = useQueryClient();

  const { data: latestMatches, isLoading: matchesLoading, error } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      return data.map((match): Match => ({
        id: match.id,
        team1Id: match.team1_id,
        team2Id: match.team2_id,
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        date: match.date,
        location: match.location || '',
        iscompleted: match.iscompleted,
        winnerId: match.winner_id,
        loserId: match.loser_id,
        team1_game_wins: match.team1_game_wins,
        team2_game_wins: match.team2_game_wins,
        round_number: match.round_number,
        position: match.position,
        bracket_id: match.bracket_id,
        match_type: match.match_type,
        next_match_id: match.next_match_id,
        next_loser_match_id: match.next_loser_match_id,
        best_of: match.best_of
      }));
    },
    staleTime: 1000 * 60 * 3, // 3 minutes - rankings only update after match completions
  });

  return {
    latestMatches,
    matchesLoading,
    matchesError: error as Error | null,
  };
};


import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Match } from "@/types";

export const useTeamMatches = (teamId: string | undefined) => {
  const matchesQuery = useQuery({
    queryKey: ["team-matches", teamId],
    queryFn: async () => {
      if (!teamId) return { upcomingMatches: [], pastMatches: [] };

      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
        .order("date", { ascending: true });

      if (error) throw error;

      const today = new Date();
      const matchData = data || [];
      
      // Map database rows to Match interface with camelCase properties
      const mappedMatches = matchData.map(row => ({
        ...row,
        team1Id: row.team1_id,
        team2Id: row.team2_id,
        team1Score: row.team1_score,
        team2Score: row.team2_score,
        team1GameWins: row.team1_game_wins,
        team2GameWins: row.team2_game_wins,
        winnerId: row.winner_id,
        loserId: row.loser_id
      })) as Match[];
      
      return {
        upcomingMatches: mappedMatches.filter(m => m.date && new Date(m.date) > today),
        pastMatches: mappedMatches.filter(m => m.date && new Date(m.date) <= today),
      };
    },
    enabled: !!teamId,
  });

  return {
    upcomingMatches: matchesQuery.data?.upcomingMatches ?? [],
    pastMatches: matchesQuery.data?.pastMatches ?? [],
    isLoadingMatches: matchesQuery.isLoading,
  };
};

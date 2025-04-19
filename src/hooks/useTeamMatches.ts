
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
      
      return {
        upcomingMatches: matchData.filter(m => m.date && new Date(m.date) > today),
        pastMatches: matchData.filter(m => m.date && new Date(m.date) <= today),
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

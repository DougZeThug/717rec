
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Pulls all and top 10 teams by power_score, non-null, sorted DESC
export const usePowerScoresData = () => {
  const { data: allTeams, isLoading: isLoadingAll } = useQuery({
    queryKey: ['v_team_power_scores', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_team_power_scores')
        .select('*')
        .not("power_score", "is", null)
        .order('power_score', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 20000,
  });

  const { data: top10, isLoading: isLoadingTop } = useQuery({
    queryKey: ['v_team_power_scores', 'top10'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_team_power_scores')
        .select('*')
        .not("power_score", "is", null)
        .order('power_score', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    staleTime: 20000,
  });

  return {
    allTeams: allTeams || [],
    isLoadingAll,
    top10: top10 || [],
    isLoadingTop,
  };
};

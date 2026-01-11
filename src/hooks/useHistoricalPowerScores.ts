import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';

type PowerScoreHistory = {
  team_id: string;
  power_scores: { date: string; score: number }[];
};

/**
 * Hook to fetch historical power scores for a team or teams
 */
export const useHistoricalPowerScores = (teamId?: string) => {
  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['historical-power-scores', teamId ?? 'all'],
    queryFn: async () => {
      // In a real implementation, you would fetch from a table that stores historical power scores
      // For now, we'll simulate by using current scores and applying small random changes
      const { data: teams, error } = await supabase
        .from('v_team_details')
        .select('team_id, name, power_score')
        .order('name');

      if (error) throw error;

      // Process data to create historical records
      // In a real implementation, this would come from a dedicated history table
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      // Generate previous scores with small variations
      const lastWeekScores: Record<string, number> = {};

      const processedData = teams.map((team) => {
        const currentScore = team.power_score || 50;
        // Simulate previous scores with variations
        const weekOldScore = Math.max(0, currentScore - (Math.random() * 10 - 2));
        const twoWeekOldScore = Math.max(0, weekOldScore - (Math.random() * 8 - 2));

        // Store last week's scores for trending calculation
        lastWeekScores[team.team_id] = weekOldScore;

        return {
          team_id: team.team_id,
          power_scores: [
            { date: twoWeeksAgo.toISOString(), score: twoWeekOldScore },
            { date: oneWeekAgo.toISOString(), score: weekOldScore },
            { date: new Date().toISOString(), score: currentScore },
          ],
        };
      });

      // If a specific team ID is provided, filter the data
      const filteredData = teamId
        ? processedData.filter((item) => item.team_id === teamId)
        : processedData;

      return { historicalScores: filteredData, previousScores: lastWeekScores };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - historical data is stable
  });

  return {
    historicalScores: data?.historicalScores ?? ([] as PowerScoreHistory[]),
    previousScores: data?.previousScores ?? ({} as Record<string, number>),
    loading,
    error: error ?? null,
  };
};

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
      // Fetch current team data to get latest scores
      const { data: teams, error: teamsError } = await supabase
        .from('v_team_details')
        .select('team_id, name, power_score')
        .order('name');

      if (teamsError) throw teamsError;

      // Fetch historical snapshots from power_score_snapshots table
      let snapshotsQuery = supabase
        .from('power_score_snapshots')
        .select('team_id, power_score, snapshot_date, week_number, season_id')
        .order('snapshot_date', { ascending: true });

      // Filter by team if specified
      if (teamId) {
        snapshotsQuery = snapshotsQuery.eq('team_id', teamId);
      }

      const { data: snapshots, error: snapshotsError } = await snapshotsQuery;

      if (snapshotsError) throw snapshotsError;

      // Group snapshots by team
      const snapshotsByTeam: Record<string, Array<{ date: string; score: number }>> = {};
      snapshots?.forEach((snapshot) => {
        if (!snapshotsByTeam[snapshot.team_id]) {
          snapshotsByTeam[snapshot.team_id] = [];
        }
        snapshotsByTeam[snapshot.team_id].push({
          date: snapshot.snapshot_date,
          score: snapshot.power_score || 0,
        });
      });

      // Calculate last week's scores for trending
      const lastWeekScores: Record<string, number> = {};

      const processedData = teams.map((team) => {
        const currentScore = team.power_score || 50;
        const historicalScores = snapshotsByTeam[team.team_id] || [];

        // Add current score as the most recent data point
        const allScores = [
          ...historicalScores,
          { date: new Date().toISOString(), score: currentScore },
        ];

        // Get last week's score (second-to-last entry if available)
        if (allScores.length >= 2) {
          lastWeekScores[team.team_id] = allScores[allScores.length - 2].score;
        } else {
          lastWeekScores[team.team_id] = currentScore;
        }

        return {
          team_id: team.team_id,
          power_scores: allScores,
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

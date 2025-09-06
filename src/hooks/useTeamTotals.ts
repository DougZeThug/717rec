import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TeamTotals {
  career_match_wins: number;
  career_match_losses: number;
  career_game_wins: number;
  career_game_losses: number;
  championships: number;
  runner_ups: number;
  playoff_finishes: Array<{ rank: number; season_name: string }>;
}

const fetchTeamTotals = async (teamId: string): Promise<TeamTotals | null> => {
  // Get career stats from team_season_stats
  const { data: seasonStats, error: seasonError } = await supabase
    .from('team_season_stats')
    .select(`
      match_wins,
      match_losses,
      game_wins,
      game_losses,
      champion,
      runner_up,
      playoff_rank,
      seasons!inner(name)
    `)
    .eq('team_id', teamId);

  if (seasonError) {
    console.error('Error fetching team season stats:', seasonError);
    return null;
  }

  if (!seasonStats || seasonStats.length === 0) {
    return {
      career_match_wins: 0,
      career_match_losses: 0,
      career_game_wins: 0,
      career_game_losses: 0,
      championships: 0,
      runner_ups: 0,
      playoff_finishes: []
    };
  }

  // Calculate career totals
  const career_match_wins = seasonStats.reduce((sum, stat) => sum + (stat.match_wins || 0), 0);
  const career_match_losses = seasonStats.reduce((sum, stat) => sum + (stat.match_losses || 0), 0);
  const career_game_wins = seasonStats.reduce((sum, stat) => sum + (stat.game_wins || 0), 0);
  const career_game_losses = seasonStats.reduce((sum, stat) => sum + (stat.game_losses || 0), 0);
  
  // Count championships and runner-ups
  const championships = seasonStats.filter(stat => stat.champion).length;
  const runner_ups = seasonStats.filter(stat => stat.runner_up).length;
  
  // Get playoff finishes (sorted by most recent)
  const playoff_finishes = seasonStats
    .filter(stat => stat.playoff_rank)
    .map(stat => ({
      rank: stat.playoff_rank!,
      season_name: stat.seasons?.name || 'Unknown Season'
    }))
    .sort((a, b) => a.rank - b.rank);

  return {
    career_match_wins,
    career_match_losses,
    career_game_wins,
    career_game_losses,
    championships,
    runner_ups,
    playoff_finishes
  };
};

export const useTeamTotals = (teamId: string) => {
  const query = useQuery({
    queryKey: ['team-totals', teamId],
    queryFn: () => teamId ? fetchTeamTotals(teamId) : Promise.resolve(null),
    enabled: !!teamId,
    staleTime: 0,
  });

  return {
    totals: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};
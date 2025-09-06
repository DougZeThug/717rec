import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TeamTotals {
  career_match_wins: number;
  career_match_losses: number;
  career_game_wins: number;
  career_game_losses: number;
  career_playoff_wins: number;
  career_playoff_losses: number;
  championships: number;
  runner_ups: number;
  playoff_finishes: Array<{ rank: number; season_name: string }>;
  career_power_score: number;
}

const calculateCareerPowerScore = async (
  teamId: string,
  championships: number,
  runnerUps: number,
  careerMatchWins: number,
  careerMatchLosses: number,
  careerGameWins: number,
  careerGameLosses: number,
  careerPlayoffWins: number,
  careerPlayoffLosses: number
): Promise<number> => {
  // Career Power Score using historical season data as foundation + playoff bonuses
  
  // Get historical season power scores from team_season_stats
  const { data: seasonStats } = await supabase
    .from('team_season_stats')
    .select('power_score, match_wins, match_losses')
    .eq('team_id', teamId)
    .not('power_score', 'is', null);

  if (!seasonStats || seasonStats.length === 0) {
    // Fallback for teams with no historical data - use team's division weight * 100
    const { data: teamData } = await supabase
      .from('teams')
      .select('divisions(division_weight)')
      .eq('id', teamId)
      .single();
    
    const teamDivisionWeight = teamData?.divisions?.division_weight || 0.85;
    return teamDivisionWeight * 100; // Convert to 0-100 scale
  }

  // Calculate weighted average of historical season power scores
  let totalWeightedScore = 0;
  let totalMatches = 0;
  
  for (const season of seasonStats) {
    const seasonMatches = season.match_wins + season.match_losses;
    if (seasonMatches > 0 && season.power_score !== null) {
      totalWeightedScore += season.power_score * seasonMatches;
      totalMatches += seasonMatches;
    }
  }
  
  const baseCareerScore = totalMatches > 0 ? totalWeightedScore / totalMatches : 50;
  
  // Calculate playoff bonuses (modest and capped)
  const championshipBonus = championships * 7; // 7 points per championship
  const runnerUpBonus = runnerUps * 4; // 4 points per runner-up
  
  // Calculate other playoff performance bonus from playoff record
  const totalPlayoffMatches = careerPlayoffWins + careerPlayoffLosses;
  const playoffWinRate = totalPlayoffMatches > 0 ? careerPlayoffWins / totalPlayoffMatches : 0;
  const otherPlayoffBonus = Math.max(0, (playoffWinRate - 0.5) * 4); // Bonus for >50% playoff win rate
  
  // Total playoff bonus (capped at +15 points)
  const totalPlayoffBonus = Math.min(15, championshipBonus + runnerUpBonus + otherPlayoffBonus);
  
  // Final career power score
  return Math.min(100, baseCareerScore + totalPlayoffBonus);
};

export const fetchTeamTotals = async (teamId: string): Promise<TeamTotals | null> => {
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

  // Get current season matches (not yet in team_season_stats)
  const { data: currentMatches, error: matchError } = await supabase
    .from('matches')
    .select(`
      winner_id,
      loser_id,
      team1_game_wins,
      team2_game_wins,
      team1_id,
      team2_id,
      season_id
    `)
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .eq('iscompleted', true);

  if (matchError) {
    console.error('Error fetching current matches:', matchError);
  }

  // Get playoff matches
  const { data: playoffMatches, error: playoffError } = await supabase
    .from('playoff_matches')
    .select(`
      winner_id,
      loser_id,
      team1_score,
      team2_score,
      team1_id,
      team2_id
    `)
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .not('winner_id', 'is', null);

  if (playoffError) {
    console.error('Error fetching playoff matches:', playoffError);
  }

  // Calculate career totals from season stats
  let career_match_wins = seasonStats?.reduce((sum, stat) => sum + (stat.match_wins || 0), 0) || 0;
  let career_match_losses = seasonStats?.reduce((sum, stat) => sum + (stat.match_losses || 0), 0) || 0;
  let career_game_wins = seasonStats?.reduce((sum, stat) => sum + (stat.game_wins || 0), 0) || 0;
  let career_game_losses = seasonStats?.reduce((sum, stat) => sum + (stat.game_losses || 0), 0) || 0;

  // Add current season matches
  if (currentMatches) {
    for (const match of currentMatches) {
      if (match.winner_id === teamId) {
        career_match_wins++;
        career_game_wins += match.team1_id === teamId ? (match.team1_game_wins || 0) : (match.team2_game_wins || 0);
        career_game_losses += match.team1_id === teamId ? (match.team2_game_wins || 0) : (match.team1_game_wins || 0);
      } else if (match.loser_id === teamId) {
        career_match_losses++;
        career_game_wins += match.team1_id === teamId ? (match.team1_game_wins || 0) : (match.team2_game_wins || 0);
        career_game_losses += match.team1_id === teamId ? (match.team2_game_wins || 0) : (match.team1_game_wins || 0);
      }
    }
  }

  // Calculate playoff record
  let career_playoff_wins = 0;
  let career_playoff_losses = 0;

  if (playoffMatches) {
    for (const match of playoffMatches) {
      if (match.winner_id === teamId) {
        career_playoff_wins++;
        career_game_wins += match.team1_id === teamId ? (match.team1_score || 0) : (match.team2_score || 0);
        career_game_losses += match.team1_id === teamId ? (match.team2_score || 0) : (match.team1_score || 0);
      } else if (match.loser_id === teamId) {
        career_playoff_losses++;
        career_game_wins += match.team1_id === teamId ? (match.team1_score || 0) : (match.team2_score || 0);
        career_game_losses += match.team1_id === teamId ? (match.team2_score || 0) : (match.team1_score || 0);
      }
    }
  }

  // Add playoff matches to overall career record
  career_match_wins += career_playoff_wins;
  career_match_losses += career_playoff_losses;
  
  // Count championships and runner-ups
  const championships = seasonStats?.filter(stat => stat.champion).length || 0;
  const runner_ups = seasonStats?.filter(stat => stat.runner_up).length || 0;
  
  // Get playoff finishes (sorted by rank)
  const playoff_finishes = seasonStats
    ?.filter(stat => stat.playoff_rank)
    .map(stat => ({
      rank: stat.playoff_rank!,
      season_name: stat.seasons?.name || 'Unknown Season'
    }))
    .sort((a, b) => a.rank - b.rank) || [];

  // Calculate career power score
  const career_power_score = await calculateCareerPowerScore(
    teamId,
    championships,
    runner_ups,
    career_match_wins,
    career_match_losses,
    career_game_wins,
    career_game_losses,
    career_playoff_wins,
    career_playoff_losses
  );

  return {
    career_match_wins,
    career_match_losses,
    career_game_wins,
    career_game_losses,
    career_playoff_wins,
    career_playoff_losses,
    championships,
    runner_ups,
    playoff_finishes,
    career_power_score
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
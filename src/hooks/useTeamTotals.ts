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
  careerMatchWins: number,
  careerMatchLosses: number,
  careerGameWins: number,
  careerGameLosses: number,
  careerPlayoffWins: number,
  careerPlayoffLosses: number
): Promise<number> => {
  // Career Power Score using 40/40/20 formula with modest playoff weighting
  
  // Get team's division for context
  const { data: teamData } = await supabase
    .from('teams')
    .select('division_id, divisions(division_weight)')
    .eq('id', teamId)
    .single();
  
  const teamDivisionWeight = teamData?.divisions?.division_weight || 0.85;
  
  // 40% Career Weighted Match Win Percentage
  const totalRegularMatches = careerMatchWins + careerMatchLosses;
  const totalPlayoffMatches = careerPlayoffWins + careerPlayoffLosses;
  
  // Apply modest 1.1x weight to playoff wins (reduced from 1.3x)
  const weightedMatchWins = careerMatchWins + (careerPlayoffWins * 1.1);
  const weightedTotalMatches = totalRegularMatches + (totalPlayoffMatches * 1.1);
  const weightedMatchWinPercentage = weightedTotalMatches > 0 ? weightedMatchWins / weightedTotalMatches : 0;

  // 40% Career Strength of Schedule (hardcoded with playoff context)
  const regularSeasonSOS = teamDivisionWeight; // Use team's actual division weight
  const playoffSOS = Math.min(teamDivisionWeight + 0.1, 1.0); // Modest playoff SOS bonus, capped at 1.0
  const totalMatches = totalRegularMatches + totalPlayoffMatches;
  const strengthOfSchedule = totalMatches > 0 
    ? ((regularSeasonSOS * totalRegularMatches) + (playoffSOS * totalPlayoffMatches)) / totalMatches
    : regularSeasonSOS;

  // 20% Career Weighted Game Win Percentage  
  const totalRegularGames = careerGameWins + careerGameLosses;
  const estimatedPlayoffGames = totalPlayoffMatches * 2.3; // More conservative estimate
  
  // Apply modest 1.1x weight to playoff game performance (reduced from 1.2x)
  const weightedGameWins = careerGameWins + (careerPlayoffWins * 2.3 * 1.1);
  const weightedTotalGames = totalRegularGames + (estimatedPlayoffGames * 1.1);
  const weightedGameWinPercentage = weightedTotalGames > 0 ? weightedGameWins / weightedTotalGames : 0;
  
  // Apply 40/40/20 formula
  const rawCareerPowerScore = (weightedMatchWinPercentage * 0.4) + (strengthOfSchedule * 0.4) + (weightedGameWinPercentage * 0.2);
  
  // Apply division-based caps to prevent unrealistic scores
  const divisionCap = teamDivisionWeight <= 0.75 ? 65 : // Rec divisions cap at 65
                     teamDivisionWeight <= 0.90 ? 80 : // Int divisions cap at 80  
                     95; // Comp divisions cap at 95
  
  const careerPowerScore = Math.min(rawCareerPowerScore * 100, divisionCap);
  
  return careerPowerScore;
};

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
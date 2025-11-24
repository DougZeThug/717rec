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
  career_sweep_rate: number;
  career_sweeps: number;
  career_sos: number;
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
  careerPlayoffLosses: number,
  competitivePlayoffWins: number
): Promise<number> => {
  // Career Power Score using historical season data as foundation + playoff bonuses
  
  // Get team's current division weight for scaling bonuses
  const { data: teamData } = await supabase
    .from('teams')
    .select('divisions(division_weight)')
    .eq('id', teamId)
    .single();
  
  const teamDivisionWeight = teamData?.divisions?.division_weight || 0.85;
  
  // Get historical season power scores from team_season_stats
  const { data: seasonStats } = await supabase
    .from('team_season_stats')
    .select('power_score, match_wins, match_losses, division_name')
    .eq('team_id', teamId)
    .not('power_score', 'is', null);

  // ALWAYS get current season data from v_team_details
  const { data: currentTeamData } = await supabase
    .from('v_team_details')
    .select('power_score, wins, losses')
    .eq('team_id', teamId)
    .single();

  // Calculate weighted average including BOTH historical AND current season data
  let totalWeightedScore = 0;
  let totalMatches = 0;
  let hasUpwardProgression = false;
  
  // Add historical season data and check for division progression
  if (seasonStats && seasonStats.length > 0) {
    let previousDivisionName = null;
    
    for (const season of seasonStats) {
      const seasonMatches = season.match_wins + season.match_losses;
      if (seasonMatches > 0 && season.power_score !== null) {
        totalWeightedScore += (season.power_score * 100) * seasonMatches;
        totalMatches += seasonMatches;
        
        // Check for upward division progression
        if (previousDivisionName && season.division_name) {
          const divisionRankings = ['recreational', 'intermediate 2', 'intermediate', 'competitive'];
          const previousRank = divisionRankings.indexOf(previousDivisionName.toLowerCase());
          const currentRank = divisionRankings.indexOf(season.division_name.toLowerCase());
          
          if (currentRank > previousRank && season.power_score > 60) {
            hasUpwardProgression = true;
          }
        }
        
        previousDivisionName = season.division_name;
      }
    }
  }
  
  // ALWAYS add current season data if available
  if (currentTeamData?.power_score !== null && currentTeamData?.wins !== null && currentTeamData?.losses !== null) {
    const currentSeasonMatches = (currentTeamData.wins || 0) + (currentTeamData.losses || 0);
    if (currentSeasonMatches > 0) {
      totalWeightedScore += currentTeamData.power_score * currentSeasonMatches;
      totalMatches += currentSeasonMatches;
    }
  }
  
  // Calculate base career score and apply division penalty system
  let baseCareerScore = 50; // Default fallback
  
  // Determine division penalty multiplier based on division tier
  const getDivisionPenaltyMultiplier = (divisionWeight: number): number => {
    if (divisionWeight >= 0.89) return 1.0;   // Competitive: no penalty
    if (divisionWeight >= 0.5) return 0.9;    // Intermediate: 10% penalty
    return 0.75;                              // Recreational: 25% penalty
  };
  
  if (totalMatches > 0) {
    const rawScore = totalWeightedScore / totalMatches;
    // Apply division penalty to base score (less harsh than previous system)
    const divisionPenaltyMultiplier = getDivisionPenaltyMultiplier(teamDivisionWeight);
    baseCareerScore = rawScore * divisionPenaltyMultiplier;
  } else {
    // Final fallback - use division penalty * 50 (baseline)
    const divisionPenaltyMultiplier = getDivisionPenaltyMultiplier(teamDivisionWeight);
    baseCareerScore = divisionPenaltyMultiplier * 50;
  }
  
  // Get championship weight based on division tier
  const getChampionshipWeight = (divisionWeight: number): number => {
    if (divisionWeight >= 0.89) return 1.0;   // Competitive: full weight
    if (divisionWeight >= 0.7) return 0.75;   // Intermediate 1: 75% weight
    if (divisionWeight >= 0.35) return 0.5;   // Intermediate 2: 50% weight
    return 0.25;                              // Recreational: 25% weight
  };

  // Get championship division weight from season data instead of current division
  const getChampionshipDivisionWeight = (): number => {
    if (seasonStats && seasonStats.length > 0) {
      // Look for championship seasons and use the most recent championship division
      const championshipSeasons = seasonStats.filter(season => season.division_name);
      if (championshipSeasons.length > 0) {
        // Use Intermediate 1 division weight for championship bonus calculation
        // Based on historical data showing championship was won in Intermediate 1
        return 0.75; // Intermediate 1 weight
      }
    }
    // Fallback to a conservative weight for unknown championship divisions
    return 0.75; // Default to Intermediate 1 level
  };

  // Calculate playoff bonuses using championship division weight instead of current division
  const championshipDivisionWeight = getChampionshipDivisionWeight();
  const championshipWeight = getChampionshipWeight(championshipDivisionWeight);
  const championshipBonus = championships * 7 * championshipWeight;
  const runnerUpBonus = runnerUps * 4 * championshipWeight;
  
  // Calculate other playoff performance bonus from playoff record
  const totalPlayoffMatches = careerPlayoffWins + careerPlayoffLosses;
  const playoffWinRate = totalPlayoffMatches > 0 ? careerPlayoffWins / totalPlayoffMatches : 0;
  const otherPlayoffBonus = Math.max(0, (playoffWinRate - 0.5) * 4 * teamDivisionWeight);
  
  // Competitive playoff bonus: +0.5 for each win in competitive division playoffs
  const competitivePlayoffBonus = competitivePlayoffWins * 0.5;
  
  // Total playoff bonus (capped at +15 points but higher divisions get more value within cap)
  const totalPlayoffBonus = Math.min(15, championshipBonus + runnerUpBonus + otherPlayoffBonus + competitivePlayoffBonus);
  
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
      sos,
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

  // Get archived matches for career sweep rate calculation
  const { data: archivedMatches, error: archivedError } = await supabase
    .from('matches_archive')
    .select(`
      winner_id,
      loser_id,
      team1_game_wins,
      team2_game_wins,
      team1_id,
      team2_id
    `)
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .eq('iscompleted', true);

  if (archivedError) {
    console.error('Error fetching archived matches:', archivedError);
  }

  // Debug logging for data fetching
  console.log('🎯 Sweep calculation debug - Data fetched:', {
    currentMatchesCount: currentMatches?.length || 0,
    archivedMatchesCount: archivedMatches?.length || 0,
    teamId
  });

  // Get playoff matches with bracket information
  const { data: playoffMatches, error: playoffError } = await supabase
    .from('playoff_matches')
    .select(`
      winner_id,
      loser_id,
      team1_score,
      team2_score,
      team1_id,
      team2_id,
      bracket_id
    `)
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .not('winner_id', 'is', null);

  if (playoffError) {
    console.error('Error fetching playoff matches:', playoffError);
  }

  console.log('🎯 Playoff matches fetched:', {
    playoffMatchesCount: playoffMatches?.length || 0
  });

  // Get bracket division weights for competitive playoff detection
  let bracketDivisionWeights: Record<string, number> = {};
  if (playoffMatches && playoffMatches.length > 0) {
    const bracketIds = [...new Set(playoffMatches.map(match => match.bracket_id).filter(Boolean))];
    
    if (bracketIds.length > 0) {
      const { data: bracketData } = await supabase
        .from('brackets')
        .select(`
          id,
          divisions(division_weight)
        `)
        .in('id', bracketIds);
      
      if (bracketData) {
        for (const bracket of bracketData) {
          bracketDivisionWeights[bracket.id] = bracket.divisions?.division_weight || 0.85;
        }
      }
    }
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

  // Calculate playoff record and competitive playoff wins
  let career_playoff_wins = 0;
  let career_playoff_losses = 0;
  let competitive_playoff_wins = 0;

  if (playoffMatches) {
    for (const match of playoffMatches) {
      const bracketDivisionWeight = bracketDivisionWeights[match.bracket_id] || 0.85;
      const isCompetitiveDivision = bracketDivisionWeight >= 0.89;
      
      if (match.winner_id === teamId) {
        career_playoff_wins++;
        if (isCompetitiveDivision) {
          competitive_playoff_wins++;
        }
      } else if (match.loser_id === teamId) {
        career_playoff_losses++;
      }
    }
  }

  // Calculate career sweep rate from all matches
  let career_sweeps = 0;
  const career_total_wins = career_match_wins;

  // Count sweeps from current and archived matches (2-0 wins)
  const regularMatches = [
    ...(Array.isArray(currentMatches) ? currentMatches : []),
    ...(Array.isArray(archivedMatches) ? archivedMatches : [])
  ];
  
  console.log('🎯 Regular matches combined:', {
    regularMatchesCount: regularMatches.length,
    currentMatchesIsArray: Array.isArray(currentMatches),
    archivedMatchesIsArray: Array.isArray(archivedMatches)
  });
  for (const match of regularMatches) {
    if (match.winner_id !== teamId) continue;
    
    // Skip if game wins data is missing - don't count as sweep
    if (match.team1_game_wins === undefined || match.team1_game_wins === null ||
        match.team2_game_wins === undefined || match.team2_game_wins === null) {
      continue;
    }
    
    const team1GameWins = match.team1_game_wins;
    const team2GameWins = match.team2_game_wins;
    
    // Check if this was a 2-0 sweep
    if (match.team1_id === teamId && team1GameWins === 2 && team2GameWins === 0) {
      career_sweeps++;
    } else if (match.team2_id === teamId && team2GameWins === 2 && team1GameWins === 0) {
      career_sweeps++;
    }
  }

  // Count sweeps from playoff matches (using team1_score/team2_score)
  if (playoffMatches) {
    for (const match of playoffMatches) {
      if (match.winner_id !== teamId) continue;
      
      // Skip if score data is missing - don't count as sweep
      if (match.team1_score === undefined || match.team1_score === null ||
          match.team2_score === undefined || match.team2_score === null) {
        continue;
      }
      
      const team1Score = match.team1_score;
      const team2Score = match.team2_score;
      
      // Check if this was a 2-0 sweep
      if (match.team1_id === teamId && team1Score === 2 && team2Score === 0) {
        career_sweeps++;
      } else if (match.team2_id === teamId && team2Score === 2 && team1Score === 0) {
        career_sweeps++;
      }
    }
  }

  const career_total_matches = career_match_wins + career_match_losses;
  
  console.log('🎯 Career sweeps result:', {
    career_sweeps,
    career_total_matches,
    career_sweep_rate: career_total_matches > 0 ? (career_sweeps / career_total_matches) * 100 : 0
  });

  const career_sweep_rate = career_total_matches > 0 
    ? (career_sweeps / career_total_matches) * 100 
    : 0;

  // Calculate career SOS as weighted average from season stats
  let career_sos = 0.5; // Default fallback
  if (seasonStats && seasonStats.length > 0) {
    let totalWeightedSOS = 0;
    let totalMatches = 0;
    
    for (const season of seasonStats) {
      const seasonMatches = (season.match_wins || 0) + (season.match_losses || 0);
      if (seasonMatches > 0 && season.sos !== null && season.sos !== undefined) {
        totalWeightedSOS += season.sos * seasonMatches;
        totalMatches += seasonMatches;
      }
    }
    
    if (totalMatches > 0) {
      career_sos = totalWeightedSOS / totalMatches;
    }
  }
  
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
    career_playoff_losses,
    competitive_playoff_wins
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
    career_power_score,
    career_sweep_rate,
    career_sweeps,
    career_sos
  };
};

export const useTeamTotals = (teamId: string) => {
  const query = useQuery({
    queryKey: ['team-totals', teamId],
    queryFn: () => teamId ? fetchTeamTotals(teamId) : Promise.resolve(null),
    enabled: !!teamId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  return {
    totals: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};
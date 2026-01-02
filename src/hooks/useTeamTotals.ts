import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DivisionRecord {
  wins: number;
  losses: number;
}

interface TeamTotals {
  career_match_wins: number;
  career_match_losses: number;
  career_game_wins: number;
  career_game_losses: number;
  career_playoff_wins: number;
  career_playoff_losses: number;
  championships: number;
  runner_ups: number;
  playoff_finishes: Array<{ rank: number; season_name: string; division_name: string }>;
  career_power_score: number;
  career_sweep_rate: number;
  career_sweeps: number;
  career_sos: number;
  division_records: {
    competitive: DivisionRecord;
    intermediate: DivisionRecord;
    recreational: DivisionRecord;
  };
}

const calculateCareerPowerScore = async (
  teamId: string,
  championshipDivisions: string[],  // Division names where championships were won
  runnerUpDivisions: string[],      // Division names where runner-ups were earned
  careerPlayoffWins: number,
  careerPlayoffLosses: number,
  competitivePlayoffWins: number,
  teamDivisionWeight: number        // Current team division weight for other bonuses
): Promise<number> => {
  // Career Power Score = weighted average of season power scores + playoff bonuses
  
  // Fetch season stats and current team data in parallel
  const [seasonStatsResult, currentTeamDataResult] = await Promise.all([
    supabase
      .from('team_season_stats')
      .select('power_score, match_wins, match_losses')
      .eq('team_id', teamId)
      .not('power_score', 'is', null),
    supabase
      .from('v_team_details')
      .select('power_score, wins, losses')
      .eq('team_id', teamId)
      .single()
  ]);

  const seasonStats = seasonStatsResult.data;
  const currentTeamData = currentTeamDataResult.data;

  // Calculate weighted average of season power scores (no division penalties)
  let totalWeightedScore = 0;
  let totalMatches = 0;
  
  // Add historical season data (power scores are already on 0-1 scale, multiply by 100)
  if (seasonStats && seasonStats.length > 0) {
    for (const season of seasonStats) {
      const seasonMatches = (season.match_wins || 0) + (season.match_losses || 0);
      if (seasonMatches > 0 && season.power_score !== null) {
        totalWeightedScore += (season.power_score * 100) * seasonMatches;
        totalMatches += seasonMatches;
      }
    }
  }
  
  // Add current season data if available (power score already on 0-100 scale)
  if (currentTeamData?.power_score !== null && currentTeamData?.wins !== null && currentTeamData?.losses !== null) {
    const currentSeasonMatches = (currentTeamData.wins || 0) + (currentTeamData.losses || 0);
    if (currentSeasonMatches > 0) {
      totalWeightedScore += currentTeamData.power_score * currentSeasonMatches;
      totalMatches += currentSeasonMatches;
    }
  }
  
  // Base career score is the weighted average (no division penalties applied)
  let baseCareerScore = totalMatches > 0 ? totalWeightedScore / totalMatches : 50;
  
  // Get championship weight based on division name - matches 4 playoff division tiers
  const getChampionshipWeight = (divisionName: string): number => {
    const name = divisionName.toLowerCase();
    // Competitive playoff (weight 1.0)
    if (name.includes('competitive')) return 1.0;
    // Intermediate High playoff (weight 0.70)
    if (name.includes('intermediate high') || name.includes('intermediate 1') || name === 'cuspers') return 0.70;
    // Intermediate Low playoff (weight 0.45)
    if (name.includes('intermediate low') || name.includes('intermediate 2') || name === 'intermediate') return 0.45;
    // Recreational (weight 0.25)
    return 0.25;
  };

  // Calculate championship bonus - each scaled by its historical division weight
  let championshipBonus = 0;
  for (const divName of championshipDivisions) {
    championshipBonus += 7 * getChampionshipWeight(divName);
  }

  // Calculate runner-up bonus - each scaled by its historical division weight
  let runnerUpBonus = 0;
  for (const divName of runnerUpDivisions) {
    runnerUpBonus += 4 * getChampionshipWeight(divName);
  }
  
  // Playoff performance bonus from playoff record (uses current division weight)
  const totalPlayoffMatches = careerPlayoffWins + careerPlayoffLosses;
  const playoffWinRate = totalPlayoffMatches > 0 ? careerPlayoffWins / totalPlayoffMatches : 0;
  const otherPlayoffBonus = Math.max(0, (playoffWinRate - 0.5) * 4 * teamDivisionWeight);
  
  // Competitive playoff bonus: +0.5 for each win in competitive division playoffs
  const competitivePlayoffBonus = competitivePlayoffWins * 0.5;
  
  // Total playoff bonus (capped at +15 points)
  const totalPlayoffBonus = Math.min(15, championshipBonus + runnerUpBonus + otherPlayoffBonus + competitivePlayoffBonus);
  
  // Final career power score
  return Math.min(100, baseCareerScore + totalPlayoffBonus);
};

export const fetchTeamTotals = async (teamId: string): Promise<TeamTotals | null> => {
  // Fetch all independent queries in parallel for better performance
  const [
    teamDataResult,
    seasonStatsResult,
    currentMatchesResult,
    archivedMatchesResult,
    allTeamSeasonStatsResult,
    playoffMatchesResult
  ] = await Promise.all([
    // Get team's current division weight for playoff bonus scaling
    supabase
      .from('teams')
      .select('divisions(division_weight)')
      .eq('id', teamId)
      .single(),
    // Get career stats from team_season_stats with division info
    supabase
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
        division_name,
        seasons!inner(name)
      `)
      .eq('team_id', teamId),
    // Get current season matches with opponent team info for division lookup
    supabase
      .from('matches')
      .select(`
        winner_id,
        loser_id,
        team1_game_wins,
        team2_game_wins,
        team1_id,
        team2_id,
        season_id,
        team1:teams!matches_team1_id_fkey(id, divisions(name)),
        team2:teams!matches_team2_id_fkey(id, divisions(name))
      `)
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .eq('iscompleted', true),
    // Get archived matches for career sweep rate calculation and division records
    supabase
      .from('matches_archive')
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
      .eq('iscompleted', true),
    // Fetch all team_season_stats to build opponent division lookup map
    supabase
      .from('team_season_stats')
      .select('team_id, season_id, division_name'),
    // Get playoff matches with bracket information
    supabase
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
      .not('winner_id', 'is', null)
  ]);

  // Destructure results
  const teamData = teamDataResult.data;
  const seasonStats = seasonStatsResult.data;
  const currentMatches = currentMatchesResult.data;
  const archivedMatches = archivedMatchesResult.data;
  const allTeamSeasonStats = allTeamSeasonStatsResult.data;
  const playoffMatches = playoffMatchesResult.data;

  // Handle errors
  if (seasonStatsResult.error) {
    console.error('Error fetching team season stats:', seasonStatsResult.error);
    return null;
  }
  if (currentMatchesResult.error) {
    console.error('Error fetching current matches:', currentMatchesResult.error);
  }
  if (archivedMatchesResult.error) {
    console.error('Error fetching archived matches:', archivedMatchesResult.error);
  }
  if (playoffMatchesResult.error) {
    console.error('Error fetching playoff matches:', playoffMatchesResult.error);
  }
  
  const teamDivisionWeight = teamData?.divisions?.division_weight || 0.85;


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
  
  // Count championships and runner-ups with their historical division names
  const championships = seasonStats?.filter(stat => stat.champion).length || 0;
  const runner_ups = seasonStats?.filter(stat => stat.runner_up).length || 0;
  
  // Extract division names for championships and runner-ups
  const championshipDivisions = seasonStats
    ?.filter(stat => stat.champion)
    .map(stat => stat.division_name || 'Unknown') || [];
  
  const runnerUpDivisions = seasonStats
    ?.filter(stat => stat.runner_up)
    .map(stat => stat.division_name || 'Unknown') || [];
  
  // Get playoff finishes (sorted by rank)
  const playoff_finishes = seasonStats
    ?.filter(stat => stat.playoff_rank)
    .map(stat => ({
      rank: stat.playoff_rank!,
      season_name: stat.seasons?.name || 'Unknown Season',
      division_name: stat.division_name || 'Unknown'
    }))
    .sort((a, b) => a.rank - b.rank) || [];

  // Calculate career power score
  const career_power_score = await calculateCareerPowerScore(
    teamId,
    championshipDivisions,
    runnerUpDivisions,
    career_playoff_wins,
    career_playoff_losses,
    competitive_playoff_wins,
    teamDivisionWeight
  );

  // Helper to categorize division into tier
  // Maps "Hidden" to competitive since it has weight 1.0
  const categorizeDivision = (divisionName: string | null): 'competitive' | 'intermediate' | 'recreational' | null => {
    if (!divisionName) return null;
    const name = divisionName.toLowerCase();
    if (name.includes('competitive') || name.includes('hidden')) return 'competitive';
    if (name.includes('intermediate') || name === 'cuspers') return 'intermediate';
    if (name.includes('recreational')) return 'recreational';
    return null;
  };
  
  // Helper to get tier from bracket division weight (for playoff matches)
  const getTierFromWeight = (weight: number): 'competitive' | 'intermediate' | 'recreational' => {
    if (weight >= 0.89) return 'competitive';
    if (weight >= 0.40) return 'intermediate';
    return 'recreational';
  };

  // Initialize division records
  const division_records = {
    competitive: { wins: 0, losses: 0 },
    intermediate: { wins: 0, losses: 0 },
    recreational: { wins: 0, losses: 0 }
  };

  // Build lookup map: "teamId_seasonId" -> division_name for opponent division lookup
  const teamDivisionMap = new Map<string, string>();
  if (allTeamSeasonStats) {
    for (const stat of allTeamSeasonStats) {
      if (stat.team_id && stat.season_id && stat.division_name) {
        teamDivisionMap.set(`${stat.team_id}_${stat.season_id}`, stat.division_name);
      }
    }
  }

  // Process archived matches - look up opponent's division at time of match
  if (archivedMatches) {
    for (const match of archivedMatches) {
      const isTeam1 = match.team1_id === teamId;
      const opponentId = isTeam1 ? match.team2_id : match.team1_id;
      if (!opponentId || !match.season_id) continue;
      
      const opponentDivision = teamDivisionMap.get(`${opponentId}_${match.season_id}`);
      const tier = categorizeDivision(opponentDivision || null);
      
      if (tier) {
        if (match.winner_id === teamId) {
          division_records[tier].wins++;
        } else if (match.loser_id === teamId) {
          division_records[tier].losses++;
        }
      }
    }
  }

  // Add current season matches based on opponent's current division
  if (currentMatches) {
    for (const match of currentMatches) {
      const isTeam1 = match.team1_id === teamId;
      const opponentDivision = isTeam1 
        ? (match.team2 as any)?.divisions?.name 
        : (match.team1 as any)?.divisions?.name;
      const tier = categorizeDivision(opponentDivision);
      
      if (tier) {
        if (match.winner_id === teamId) {
          division_records[tier].wins++;
        } else if (match.loser_id === teamId) {
          division_records[tier].losses++;
        }
      }
    }
  }

  // Add playoff matches based on bracket division weight
  if (playoffMatches) {
    for (const match of playoffMatches) {
      if (!match.bracket_id) continue;
      const bracketWeight = bracketDivisionWeights[match.bracket_id] || 0.85;
      const tier = getTierFromWeight(bracketWeight);
      
      if (match.winner_id === teamId) {
        division_records[tier].wins++;
      } else if (match.loser_id === teamId) {
        division_records[tier].losses++;
      }
    }
  }

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
    career_sos,
    division_records
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
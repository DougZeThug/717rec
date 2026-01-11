import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import {
  DivisionSeasonRecord,
  SeasonBreakdown,
  TeamAdvancedStats,
} from '@/types/teamAdvancedStats';

const categorizeDivision = (
  divisionName: string | null
): 'competitive' | 'intermediate' | 'recreational' | null => {
  if (!divisionName) return null;
  const name = divisionName.toLowerCase();
  if (name.includes('competitive') || name.includes('hidden')) return 'competitive';
  if (name.includes('intermediate') || name === 'cuspers') return 'intermediate';
  if (name.includes('recreational')) return 'recreational';
  return null;
};

const createEmptyDivisionRecord = (): DivisionSeasonRecord => ({
  wins: 0,
  losses: 0,
  gameWins: 0,
  gameLosses: 0,
});

const fetchTeamSeasonBreakdown = async (teamId: string): Promise<TeamAdvancedStats | null> => {
  // Get season stats
  const { data: seasonStats, error: seasonError } = await supabase
    .from('team_season_stats')
    .select(
      `
      season_id,
      match_wins,
      match_losses,
      game_wins,
      game_losses,
      sos,
      power_score,
      champion,
      runner_up,
      playoff_rank,
      division_name,
      seasons!inner(id, name, start_date)
    `
    )
    .eq('team_id', teamId)
    .order('seasons(start_date)', { ascending: false });

  if (seasonError) {
    console.error('Error fetching team season stats:', seasonError);
    return null;
  }

  if (!seasonStats || seasonStats.length === 0) {
    return {
      seasons: [],
      bestSeason: null,
      worstSeason: null,
      averagePowerScore: 0,
      powerScoreTrend: 'stable',
      bestDivisionTier: null,
      worstDivisionTier: null,
    };
  }

  // Get all team_season_stats for opponent division lookup
  const { data: allTeamSeasonStats } = await supabase
    .from('team_season_stats')
    .select('team_id, season_id, division_name');

  const teamDivisionMap = new Map<string, string>();
  if (allTeamSeasonStats) {
    for (const stat of allTeamSeasonStats) {
      if (stat.team_id && stat.season_id && stat.division_name) {
        teamDivisionMap.set(`${stat.team_id}_${stat.season_id}`, stat.division_name);
      }
    }
  }

  // Get archived matches for sweep and close match calculations
  const { data: archivedMatches } = await supabase
    .from('matches_archive')
    .select(
      `
      winner_id,
      loser_id,
      team1_game_wins,
      team2_game_wins,
      team1_id,
      team2_id,
      season_id
    `
    )
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .eq('iscompleted', true);

  // Get playoff matches with bracket info
  const { data: playoffMatchesRaw } = await supabase
    .from('playoff_matches')
    .select(
      `
      winner_id,
      loser_id,
      team1_score,
      team2_score,
      team1_id,
      team2_id,
      bracket_id
    `
    )
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .not('winner_id', 'is', null);

  // Get bracket info separately to avoid type depth issues
  const bracketIds = [
    ...new Set((playoffMatchesRaw || []).map((m) => m.bracket_id).filter(Boolean)),
  ];

  const bracketInfoMap: Record<string, { season_id: string; division_weight: number }> = {};
  if (bracketIds.length > 0) {
    const { data: brackets } = await supabase
      .from('brackets')
      .select('id, season_id, divisions(division_weight)')
      .in('id', bracketIds);

    if (brackets) {
      for (const b of brackets) {
        bracketInfoMap[b.id] = {
          season_id: b.season_id || '',
          division_weight: (b.divisions as any)?.division_weight || 0.85,
        };
      }
    }
  }

  // Enrich playoff matches with bracket info
  const playoffMatches = (playoffMatchesRaw || []).map((m) => ({
    ...m,
    bracketInfo: m.bracket_id ? bracketInfoMap[m.bracket_id] : null,
  }));

  // Group matches by season
  const matchesBySeason = new Map<string, typeof archivedMatches>();
  const playoffMatchesBySeason = new Map<string, typeof playoffMatches>();

  if (archivedMatches) {
    for (const match of archivedMatches) {
      if (!match.season_id) continue;
      const existing = matchesBySeason.get(match.season_id) || [];
      existing.push(match);
      matchesBySeason.set(match.season_id, existing);
    }
  }

  if (playoffMatches) {
    for (const match of playoffMatches) {
      const seasonId = match.bracketInfo?.season_id;
      if (!seasonId) continue;
      const existing = playoffMatchesBySeason.get(seasonId) || [];
      existing.push(match);
      playoffMatchesBySeason.set(seasonId, existing);
    }
  }

  // Build season breakdowns
  const seasons: SeasonBreakdown[] = seasonStats.map((stat) => {
    const seasonId = stat.season_id;
    const seasonMatches = matchesBySeason.get(seasonId) || [];
    const seasonPlayoffMatches = playoffMatchesBySeason.get(seasonId) || [];

    // Calculate sweeps and close matches
    let sweeps = 0;
    let closeWins = 0;
    let closeLosses = 0;

    const divisionRecords = {
      competitive: createEmptyDivisionRecord(),
      intermediate: createEmptyDivisionRecord(),
      recreational: createEmptyDivisionRecord(),
    };

    // Process regular season matches
    for (const match of seasonMatches) {
      const isTeam1 = match.team1_id === teamId;
      const teamGameWins = isTeam1 ? match.team1_game_wins || 0 : match.team2_game_wins || 0;
      const opponentGameWins = isTeam1 ? match.team2_game_wins || 0 : match.team1_game_wins || 0;
      const isWinner = match.winner_id === teamId;

      // Sweep/close match detection
      if (isWinner) {
        if (teamGameWins === 2 && opponentGameWins === 0) {
          sweeps++;
        } else if (teamGameWins === 2 && opponentGameWins === 1) {
          closeWins++;
        }
      } else if (match.loser_id === teamId) {
        if (opponentGameWins === 2 && teamGameWins === 1) {
          closeLosses++;
        }
      }

      // Division record for this match
      const opponentId = isTeam1 ? match.team2_id : match.team1_id;
      if (opponentId) {
        const opponentDivision = teamDivisionMap.get(`${opponentId}_${seasonId}`);
        const tier = categorizeDivision(opponentDivision || null);
        if (tier) {
          if (isWinner) {
            divisionRecords[tier].wins++;
            divisionRecords[tier].gameWins += teamGameWins;
            divisionRecords[tier].gameLosses += opponentGameWins;
          } else if (match.loser_id === teamId) {
            divisionRecords[tier].losses++;
            divisionRecords[tier].gameWins += teamGameWins;
            divisionRecords[tier].gameLosses += opponentGameWins;
          }
        }
      }
    }

    // Process playoff matches
    let playoffWins = 0;
    let playoffLosses = 0;

    for (const match of seasonPlayoffMatches) {
      const isTeam1 = match.team1_id === teamId;
      const teamScore = isTeam1 ? match.team1_score || 0 : match.team2_score || 0;
      const opponentScore = isTeam1 ? match.team2_score || 0 : match.team1_score || 0;
      const isWinner = match.winner_id === teamId;

      if (isWinner) {
        playoffWins++;
        if (teamScore === 2 && opponentScore === 0) {
          sweeps++;
        } else if (teamScore === 2 && opponentScore === 1) {
          closeWins++;
        }
      } else if (match.loser_id === teamId) {
        playoffLosses++;
        if (opponentScore === 2 && teamScore === 1) {
          closeLosses++;
        }
      }

      // Playoff division record based on bracket division
      const bracketWeight = match.bracketInfo?.division_weight || 0.85;
      let tier: 'competitive' | 'intermediate' | 'recreational';
      if (bracketWeight >= 0.89) tier = 'competitive';
      else if (bracketWeight >= 0.4) tier = 'intermediate';
      else tier = 'recreational';

      if (isWinner) {
        divisionRecords[tier].wins++;
        divisionRecords[tier].gameWins += teamScore;
        divisionRecords[tier].gameLosses += opponentScore;
      } else if (match.loser_id === teamId) {
        divisionRecords[tier].losses++;
        divisionRecords[tier].gameWins += teamScore;
        divisionRecords[tier].gameLosses += opponentScore;
      }
    }

    const totalMatches = (stat.match_wins || 0) + (stat.match_losses || 0);
    const winPct = totalMatches > 0 ? ((stat.match_wins || 0) / totalMatches) * 100 : 0;

    const totalGames = (stat.game_wins || 0) + (stat.game_losses || 0);
    const gameWinPct = totalGames > 0 ? ((stat.game_wins || 0) / totalGames) * 100 : 0;

    const sweepRate = totalMatches > 0 ? (sweeps / totalMatches) * 100 : 0;
    const totalCloseMatches = closeWins + closeLosses;
    const clutchFactor = totalCloseMatches > 0 ? closeWins / totalCloseMatches : null;

    return {
      seasonId,
      seasonName: (stat.seasons as any)?.name || 'Unknown',
      divisionName: stat.division_name || 'Unknown',
      matchWins: stat.match_wins || 0,
      matchLosses: stat.match_losses || 0,
      winPct,
      gameWins: stat.game_wins || 0,
      gameLosses: stat.game_losses || 0,
      gameWinPct,
      sos: stat.sos,
      powerScore: stat.power_score !== null ? stat.power_score * 100 : null,
      playoffWins,
      playoffLosses,
      playoffRank: stat.playoff_rank,
      isChampion: stat.champion || false,
      isRunnerUp: stat.runner_up || false,
      isTop3: stat.playoff_rank !== null && stat.playoff_rank <= 3,
      sweeps,
      sweepRate,
      closeWins,
      closeLosses,
      clutchFactor,
      divisionRecords,
    };
  });

  // Calculate aggregated stats
  const seasonsWithPowerScore = seasons.filter((s) => s.powerScore !== null);
  const averagePowerScore =
    seasonsWithPowerScore.length > 0
      ? seasonsWithPowerScore.reduce((sum, s) => sum + (s.powerScore || 0), 0) /
        seasonsWithPowerScore.length
      : 0;

  // Find best/worst season by power score
  const bestSeason =
    seasonsWithPowerScore.length > 0
      ? seasonsWithPowerScore.reduce((best, s) =>
          (s.powerScore || 0) > (best.powerScore || 0) ? s : best
        )
      : null;
  const worstSeason =
    seasonsWithPowerScore.length > 0
      ? seasonsWithPowerScore.reduce((worst, s) =>
          (s.powerScore || 0) < (worst.powerScore || 0) ? s : worst
        )
      : null;

  // Calculate power score trend (compare first half to second half of seasons)
  let powerScoreTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (seasonsWithPowerScore.length >= 2) {
    const midpoint = Math.floor(seasonsWithPowerScore.length / 2);
    const recentAvg =
      seasonsWithPowerScore.slice(0, midpoint).reduce((sum, s) => sum + (s.powerScore || 0), 0) /
      midpoint;
    const olderAvg =
      seasonsWithPowerScore.slice(midpoint).reduce((sum, s) => sum + (s.powerScore || 0), 0) /
      (seasonsWithPowerScore.length - midpoint);
    const diff = recentAvg - olderAvg;
    if (diff > 3) powerScoreTrend = 'improving';
    else if (diff < -3) powerScoreTrend = 'declining';
  }

  // Calculate best/worst division tier
  const divisionTotals = {
    competitive: { wins: 0, losses: 0 },
    intermediate: { wins: 0, losses: 0 },
    recreational: { wins: 0, losses: 0 },
  };

  for (const season of seasons) {
    for (const tier of ['competitive', 'intermediate', 'recreational'] as const) {
      divisionTotals[tier].wins += season.divisionRecords[tier].wins;
      divisionTotals[tier].losses += season.divisionRecords[tier].losses;
    }
  }

  const getWinRate = (record: { wins: number; losses: number }) => {
    const total = record.wins + record.losses;
    return total > 0 ? record.wins / total : -1;
  };

  const tiers = ['competitive', 'intermediate', 'recreational'] as const;
  const tiersWithGames = tiers.filter((t) => divisionTotals[t].wins + divisionTotals[t].losses > 0);

  let bestDivisionTier: 'competitive' | 'intermediate' | 'recreational' | null = null;
  let worstDivisionTier: 'competitive' | 'intermediate' | 'recreational' | null = null;

  if (tiersWithGames.length > 0) {
    bestDivisionTier = tiersWithGames.reduce((best, tier) =>
      getWinRate(divisionTotals[tier]) > getWinRate(divisionTotals[best]) ? tier : best
    );
    worstDivisionTier = tiersWithGames.reduce((worst, tier) =>
      getWinRate(divisionTotals[tier]) < getWinRate(divisionTotals[worst]) ? tier : worst
    );
  }

  return {
    seasons,
    bestSeason,
    worstSeason,
    averagePowerScore,
    powerScoreTrend,
    bestDivisionTier,
    worstDivisionTier,
  };
};

export const useTeamSeasonBreakdown = (teamId: string | undefined) => {
  const {
    data: advancedStats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['team-season-breakdown', teamId],
    queryFn: () => fetchTeamSeasonBreakdown(teamId!),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });

  return { advancedStats, isLoading, error };
};

import { supabase } from '@/integrations/supabase/client';
import { TeamAdvancedStats } from '@/types/teamAdvancedStats';
import { DivisionRelation, SeasonRelation } from '@/hooks/teams/seasonBreakdown/types';
import { processSeasonMatches } from '@/hooks/teams/seasonBreakdown/processSeasonMatches';
import {
  calculatePowerScoreTrend,
  calculateBestWorstDivisionTiers,
} from '@/hooks/teams/seasonBreakdown/calculateSeasonStats';
import { dbLog, errorLog, scoreLog } from '@/utils/logger';
import { SeasonBreakdown } from '@/types/teamAdvancedStats';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeadToHeadData {
  team1Wins: number;
  team2Wins: number;
  totalMatches: number;
  team1GameWins: number;
  team2GameWins: number;
  isFirstMeeting: boolean;
}

export interface TeamUpdate {
  team_id: string;
  season_id: string;
  division_name: string;
  playoff_rank: number | null;
}

// ─── applyMatchResult ─────────────────────────────────────────────────────────

/**
 * Apply a match result by updating team stats via RPC.
 * Also refreshes team_season_stats for historical accuracy.
 */
export async function applyMatchResult(
  winnerId: string,
  loserId: string,
  winnerGameWins: number,
  loserGameWins: number
): Promise<boolean> {
  // Normalize UUIDs to lowercase for case-insensitive comparison
  winnerId = winnerId.toLowerCase();
  loserId = loserId.toLowerCase();

  // Validate that winner and loser are different teams
  if (winnerId === loserId) {
    const errorMsg = 'Winner and loser must be different teams';
    errorLog('Invalid applyMatchResult call - same team ID for winner and loser:', {
      winnerId,
      loserId,
    });
    throw new Error(errorMsg);
  }

  // Convert parameters to numbers to ensure proper math
  const winnerGameWinsNum = Number(winnerGameWins || 0);
  const loserGameWinsNum = Number(loserGameWins || 0);

  scoreLog(
    `Updating stats: winner ${winnerId} (+1W/+${winnerGameWinsNum}GW), loser ${loserId} (+1L/+${loserGameWinsNum}GL)`
  );

  try {
    // Use the RPC function for atomic updates to both teams
    const { data, error } = await supabase.rpc('update_team_stats', {
      p_winner_id: winnerId,
      p_loser_id: loserId,
      p_winner_game_wins: winnerGameWinsNum,
      p_loser_game_wins: loserGameWinsNum,
    });

    if (error) {
      errorLog('update_team_stats RPC failed:', error);
      throw error;
    }

    scoreLog('Team stats updated successfully');

    // Also refresh team_season_stats for historical accuracy
    const { error: seasonStatsError } = await supabase.rpc('upsert_team_season_stats');
    if (seasonStatsError) {
      errorLog('Failed to refresh season stats:', seasonStatsError);
      // Non-fatal - continue
    }

    return true;
  } catch (error) {
    errorLog('Failed to update team stats:', error);
    throw error;
  }
}

// ─── updateTeamStatsRecord ────────────────────────────────────────────────────

export const updateTeamStatsRecord = async (
  winnerId: string,
  loserId: string,
  winnerGameWins: number = 0,
  loserGameWins: number = 0
) => {
  try {
    // Ensure game wins are integers
    const parsedWinnerGameWins = parseInt(String(winnerGameWins)) || 0;
    const parsedLoserGameWins = parseInt(String(loserGameWins)) || 0;

    const success = await applyMatchResult(
      winnerId,
      loserId,
      parsedWinnerGameWins,
      parsedLoserGameWins
    );

    if (!success) {
      errorLog('Failed to update team statistics');
      return false;
    }

    return true;
  } catch (error) {
    errorLog('Error updating team statistics:', error);
    return false;
  }
};

// ─── fetchSeasonBreakdown ─────────────────────────────────────────────────────

/**
 * Fetch season-by-season breakdown stats for a team.
 * Returns null if no data exists.
 */
export const fetchSeasonBreakdown = async (teamId: string): Promise<TeamAdvancedStats | null> => {
  // Phase 1: Execute independent queries in parallel
  const [
    seasonStatsResult,
    allTeamSeasonStatsResult,
    currentMatchesResult,
    archivedMatchesResult,
    playoffMatchesResult,
  ] = await Promise.all([
    // Query 1: Get season stats
    supabase
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
      .order('seasons(start_date)', { ascending: false }),

    // Query 2: Get all team_season_stats for opponent division lookup
    supabase.from('team_season_stats').select('team_id, season_id, division_name'),

    // Query 3: Get current season matches for sweep and close match calculations
    supabase
      .from('matches')
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
      .eq('iscompleted', true),

    // Query 4: Get archived matches for sweep and close match calculations
    supabase
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
      .eq('iscompleted', true),

    // Query 5: Get playoff matches with bracket info
    supabase
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
      .not('winner_id', 'is', null),
  ]);

  // Handle errors from critical query
  if (seasonStatsResult.error) {
    errorLog('Error fetching team season stats:', seasonStatsResult.error);
    return null;
  }

  // Extract data from results
  const seasonStats = seasonStatsResult.data;
  const allTeamSeasonStats = allTeamSeasonStatsResult.data;
  const currentMatches = currentMatchesResult.data;
  const archivedMatches = archivedMatchesResult.data;
  const playoffMatchesRaw = playoffMatchesResult.data;

  // Combine current and archived matches into a single array
  const allMatches = [
    ...(Array.isArray(currentMatches) ? currentMatches : []),
    ...(Array.isArray(archivedMatches) ? archivedMatches : []),
  ];

  // Early return if no season stats
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

  // Build team division map for opponent lookups
  const teamDivisionMap = new Map<string, string>();
  if (allTeamSeasonStats) {
    for (const stat of allTeamSeasonStats) {
      if (stat.team_id && stat.season_id && stat.division_name) {
        teamDivisionMap.set(`${stat.team_id}_${stat.season_id}`, stat.division_name);
      }
    }
  }

  // Phase 2: Fetch bracket info (depends on playoffMatchesRaw from Phase 1)
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
        const divisions = b.divisions as DivisionRelation | null;
        bracketInfoMap[b.id] = {
          season_id: b.season_id || '',
          division_weight: divisions?.division_weight ?? 0.85,
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
  const matchesBySeason = new Map<string, typeof allMatches>();
  const playoffMatchesBySeason = new Map<string, typeof playoffMatches>();

  for (const match of allMatches) {
    if (!match.season_id) continue;
    const existing = matchesBySeason.get(match.season_id) || [];
    existing.push(match);
    matchesBySeason.set(match.season_id, existing);
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

    // Process matches using extracted function
    const { sweeps, closeWins, closeLosses, divisionRecords, playoffWins, playoffLosses } =
      processSeasonMatches(teamId, seasonId, seasonMatches, seasonPlayoffMatches, teamDivisionMap);

    const totalMatches = (stat.match_wins || 0) + (stat.match_losses || 0);
    const winPct = totalMatches > 0 ? ((stat.match_wins || 0) / totalMatches) * 100 : 0;

    const totalGames = (stat.game_wins || 0) + (stat.game_losses || 0);
    const gameWinPct = totalGames > 0 ? ((stat.game_wins || 0) / totalGames) * 100 : 0;

    const sweepRate = totalMatches > 0 ? (sweeps / totalMatches) * 100 : 0;
    const totalCloseMatches = closeWins + closeLosses;
    const clutchFactor = totalCloseMatches > 0 ? closeWins / totalCloseMatches : null;

    const seasonInfo = stat.seasons as SeasonRelation | null;
    return {
      seasonId,
      seasonName: seasonInfo?.name ?? 'Unknown',
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

  // Calculate power score trend using extracted function
  const powerScoreTrend = calculatePowerScoreTrend(seasonsWithPowerScore);

  // Calculate best/worst division tier using extracted function
  const { bestDivisionTier, worstDivisionTier } = calculateBestWorstDivisionTiers(seasons);

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

// ─── batchUpdateSeasonStats ───────────────────────────────────────────────────

// Normalize division names - map "Intermediate 1" and "Intermediate 2" to "Intermediate"
const normalizeDivisionName = (divisionName: string): string => {
  if (divisionName.toLowerCase().startsWith('intermediate')) {
    return 'Intermediate';
  }
  return divisionName;
};

/**
 * Batch update team_season_stats and team_details_archive for a list of team updates.
 * Processes in batches of 10 in parallel. Throws on any failure.
 */
export const batchUpdateSeasonStats = async (updates: TeamUpdate[]): Promise<void> => {
  if (updates.length === 0) return;

  dbLog(`Updating ${updates.length} team season stats...`);

  // Process updates in batches to avoid overwhelming the database
  const batchSize = 10;
  const batches = [];

  for (let i = 0; i < updates.length; i += batchSize) {
    batches.push(updates.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    // Use Promise.all for parallel updates within each batch
    const updatePromises = batch.map(async (update) => {
      const normalizedDivision = normalizeDivisionName(update.division_name);

      // Update team_season_stats with verification
      const { data: statsData, error: statsError } = await supabase
        .from('team_season_stats')
        .update({
          division_name: normalizedDivision,
          playoff_rank: update.playoff_rank,
        })
        .eq('team_id', update.team_id)
        .eq('season_id', update.season_id)
        .select('team_id');

      if (statsError) {
        throw new Error(
          `Failed to update team_season_stats for ${update.team_id}: ${statsError.message}`
        );
      }

      if (!statsData || statsData.length === 0) {
        errorLog(`Update verification failed for team_season_stats:`, {
          team_id: update.team_id,
          season_id: update.season_id,
          division_name: normalizedDivision,
        });
        throw new Error(
          `No rows updated for team ${update.team_id} in team_season_stats - check RLS policies or if record exists`
        );
      }

      // Also update team_details_archive to keep historical data in sync
      const { data: archiveData, error: archiveError } = await supabase
        .from('team_details_archive')
        .update({
          divisionname: normalizedDivision,
        })
        .eq('team_id', update.team_id)
        .eq('season_id', update.season_id)
        .select('team_id');

      if (archiveError) {
        errorLog(`Failed to update team_details_archive:`, {
          team_id: update.team_id,
          season_id: update.season_id,
          error: archiveError.message,
        });
        throw new Error(
          `Failed to update team_details_archive for ${update.team_id}: ${archiveError.message}`
        );
      }

      if (!archiveData || archiveData.length === 0) {
        // Don't fail - archive entry might not exist for this team/season
      }

      return true;
    });

    await Promise.all(updatePromises);
  }

  dbLog(`Successfully updated ${updates.length} team season stats`);
};

// ─── fetchBatchHeadToHead ─────────────────────────────────────────────────────

/**
 * Fetch head-to-head data for multiple team pairs in a single RPC call.
 * Returns a Map keyed by "team1Id-team2Id" (both orderings stored).
 */
export const fetchBatchHeadToHead = async (
  pairsJson: Array<{ team1: string | null | undefined; team2: string | null | undefined }>
): Promise<Map<string, HeadToHeadData>> => {
  const { data: results, error } = await supabase.rpc('get_batch_head_to_head', {
    p_team_pairs: pairsJson,
  });

  if (error) {
    errorLog('Batch H2H error:', error);
    return new Map<string, HeadToHeadData>();
  }

  // Create a map with keys that work for both orderings of team IDs
  const resultMap = new Map<string, HeadToHeadData>();

  for (const row of results || []) {
    const h2hData: HeadToHeadData = {
      team1Wins: row.team1_wins,
      team2Wins: row.team2_wins,
      totalMatches: row.total_matches,
      team1GameWins: row.team1_game_wins,
      team2GameWins: row.team2_game_wins,
      isFirstMeeting: row.total_matches === 0,
    };

    // Store with forward key
    resultMap.set(`${row.team1_id}-${row.team2_id}`, h2hData);

    // Also store with reversed key (swapped perspective)
    resultMap.set(`${row.team2_id}-${row.team1_id}`, {
      team1Wins: row.team2_wins,
      team2Wins: row.team1_wins,
      totalMatches: row.total_matches,
      team1GameWins: row.team2_game_wins,
      team2GameWins: row.team1_game_wins,
      isFirstMeeting: row.total_matches === 0,
    });
  }

  return resultMap;
};

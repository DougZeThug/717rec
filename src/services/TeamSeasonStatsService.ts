import {
  calculateBestWorstDivisionTiers,
  calculatePowerScoreTrend,
} from '@/hooks/teams/seasonBreakdown/calculateSeasonStats';
import { processSeasonMatches } from '@/hooks/teams/seasonBreakdown/processSeasonMatches';
import { DivisionRelation, SeasonRelation } from '@/hooks/teams/seasonBreakdown/types';
import { supabase } from '@/integrations/supabase/client';
import { NotFoundError } from '@/types/errors';
import { TeamAdvancedStats } from '@/types/teamAdvancedStats';
import { SeasonBreakdown } from '@/types/teamAdvancedStats';
import { handleDatabaseError } from '@/utils/errorHandler';
import { dbLog, errorLog } from '@/utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamUpdate {
  team_id: string;
  season_id: string;
  division_name: string;
  playoff_rank: number | null;
}

// ─── Helper functions for fetchSeasonBreakdown ────────────────────────────────

const buildTeamDivisionMap = (
  allTeamSeasonStats: { team_id: string; season_id: string; division_name: string | null }[] | null
): Map<string, string> => {
  const map = new Map<string, string>();
  if (allTeamSeasonStats) {
    for (const stat of allTeamSeasonStats) {
      if (stat.team_id && stat.season_id && stat.division_name) {
        map.set(`${stat.team_id}_${stat.season_id}`, stat.division_name);
      }
    }
  }
  return map;
};

const buildBracketInfoMap = async (
  bracketIds: string[]
): Promise<Record<string, { season_id: string; division_weight: number }>> => {
  const bracketInfoMap: Record<string, { season_id: string; division_weight: number }> = {};
  if (bracketIds.length === 0) return bracketInfoMap;

  const { data: brackets, error: bracketsError } = await supabase
    .from('brackets')
    .select('id, season_id, divisions(division_weight)')
    .in('id', bracketIds);

  if (bracketsError) {
    errorLog('Failed to fetch bracket info for season breakdown:', bracketsError);
  }

  if (brackets) {
    for (const b of brackets) {
      const divisions = b.divisions as DivisionRelation | null;
      bracketInfoMap[b.id] = {
        season_id: b.season_id || '',
        division_weight: divisions?.division_weight ?? 0.85,
      };
    }
  }

  return bracketInfoMap;
};

interface MatchRecord {
  winner_id: string | null;
  loser_id: string | null;
  team1_game_wins: number | null;
  team2_game_wins: number | null;
  team1_id: string | null;
  team2_id: string | null;
  season_id: string | null;
}

interface PlayoffMatchRecord {
  winner_id: string | null;
  loser_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  team1_id: string | null;
  team2_id: string | null;
  bracket_id: string | null;
  bracketInfo: { season_id: string; division_weight: number } | null;
}

const groupMatchesBySeason = (
  allMatches: MatchRecord[],
  playoffMatches: PlayoffMatchRecord[]
): {
  matchesBySeason: Map<string, MatchRecord[]>;
  playoffMatchesBySeason: Map<string, PlayoffMatchRecord[]>;
} => {
  const matchesBySeason = new Map<string, MatchRecord[]>();
  const playoffMatchesBySeason = new Map<string, PlayoffMatchRecord[]>();

  for (const match of allMatches) {
    if (!match.season_id) continue;
    const existing = matchesBySeason.get(match.season_id) || [];
    existing.push(match);
    matchesBySeason.set(match.season_id, existing);
  }

  for (const match of playoffMatches) {
    const seasonId = match.bracketInfo?.season_id;
    if (!seasonId) continue;
    const existing = playoffMatchesBySeason.get(seasonId) || [];
    existing.push(match);
    playoffMatchesBySeason.set(seasonId, existing);
  }

  return { matchesBySeason, playoffMatchesBySeason };
};

interface SeasonStatRow {
  season_id: string;
  match_wins: number | null;
  match_losses: number | null;
  game_wins: number | null;
  game_losses: number | null;
  sos: number | null;
  power_score: number | null;
  champion: boolean | null;
  runner_up: boolean | null;
  playoff_rank: number | null;
  division_name: string | null;
  seasons: unknown;
}

const buildSeasonBreakdown = (
  stat: SeasonStatRow,
  teamId: string,
  matchesBySeason: Map<string, MatchRecord[]>,
  playoffMatchesBySeason: Map<string, PlayoffMatchRecord[]>,
  teamDivisionMap: Map<string, string>
): SeasonBreakdown => {
  const seasonId = stat.season_id;
  const seasonMatches = matchesBySeason.get(seasonId) || [];
  const seasonPlayoffMatches = playoffMatchesBySeason.get(seasonId) || [];

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
};

// ─── fetchSeasonBreakdown ─────────────────────────────────────────────────────

/**
 * Fetch season-by-season breakdown stats for a team.
 * Returns null if no data exists.
 *
 * Query 1 (team_season_stats) is critical and throws on failure.
 * Queries 2-6 are enrichment — errors are logged but not thrown,
 * allowing graceful UI degradation with partial data.
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
    handleDatabaseError(seasonStatsResult.error, 'Failed to fetch team season stats');
  }

  // Log errors from enrichment queries (non-critical — UI degrades gracefully)
  if (allTeamSeasonStatsResult.error) {
    errorLog('Failed to fetch all team season stats for division lookup:', allTeamSeasonStatsResult.error);
  }
  if (currentMatchesResult.error) {
    errorLog('Failed to fetch current matches for season breakdown:', currentMatchesResult.error);
  }
  if (archivedMatchesResult.error) {
    errorLog('Failed to fetch archived matches for season breakdown:', archivedMatchesResult.error);
  }
  if (playoffMatchesResult.error) {
    errorLog('Failed to fetch playoff matches for season breakdown:', playoffMatchesResult.error);
  }

  // Extract data from results
  const seasonStats = seasonStatsResult.data;
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
  const teamDivisionMap = buildTeamDivisionMap(allTeamSeasonStatsResult.data);

  // Phase 2: Fetch bracket info (depends on playoffMatchesRaw from Phase 1)
  const bracketIds = [
    ...new Set((playoffMatchesRaw || []).map((m) => m.bracket_id).filter(Boolean)),
  ];
  const bracketInfoMap = await buildBracketInfoMap(bracketIds as string[]);

  // Enrich playoff matches with bracket info
  const playoffMatches = (playoffMatchesRaw || []).map((m) => ({
    ...m,
    bracketInfo: m.bracket_id ? bracketInfoMap[m.bracket_id] : null,
  }));

  // Group matches by season
  const { matchesBySeason, playoffMatchesBySeason } = groupMatchesBySeason(
    allMatches,
    playoffMatches
  );

  // Build season breakdowns
  const seasons: SeasonBreakdown[] = seasonStats.map((stat) =>
    buildSeasonBreakdown(stat, teamId, matchesBySeason, playoffMatchesBySeason, teamDivisionMap)
  );

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
      // Update team_season_stats with verification
      const { data: statsData, error: statsError } = await supabase
        .from('team_season_stats')
        .update({
          division_name: update.division_name,
          playoff_rank: update.playoff_rank,
        })
        .eq('team_id', update.team_id)
        .eq('season_id', update.season_id)
        .select('team_id');

      if (statsError) {
        handleDatabaseError(statsError, `Failed to update team_season_stats for ${update.team_id}`);
      }

      if (!statsData || statsData.length === 0) {
        errorLog('Update verification failed for team_season_stats:', {
          team_id: update.team_id,
          season_id: update.season_id,
          division_name: update.division_name,
        });
        throw new NotFoundError('TeamSeasonStats', update.team_id);
      }

      // Also update team_details_archive to keep historical data in sync
      const { data: archiveData, error: archiveError } = await supabase
        .from('team_details_archive')
        .update({
          divisionname: update.division_name,
        })
        .eq('team_id', update.team_id)
        .eq('season_id', update.season_id)
        .select('team_id');

      if (archiveError) {
        handleDatabaseError(
          archiveError,
          `Failed to update team_details_archive for ${update.team_id}`
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

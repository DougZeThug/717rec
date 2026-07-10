import type { PostgrestError } from '@supabase/supabase-js';

import { TeamAdvancedStats } from '@/types/teamAdvancedStats';
import { SeasonBreakdown } from '@/types/teamAdvancedStats';
import { handleDatabaseError } from '@/utils/errorHandler';
import { errorLog } from '@/utils/logger';

import { buildSeasonBreakdown } from './assemblers';
import { calculateBestWorstDivisionTiers, calculatePowerScoreTrend } from './calculations';
import { buildBracketInfoMap, buildTeamDivisionMap, groupMatchesBySeason } from './mappers';
import { fetchBracketsByIds, fetchSeasonBreakdownQueries } from './queries';

/**
 * Fetch season-by-season breakdown stats for a team.
 * Returns null if no data exists.
 *
 * Query 1 (team_season_stats) is critical and throws on failure.
 * Queries 2-6 are enrichment — errors are logged but not thrown,
 * allowing graceful UI degradation with partial data.
 */
export const fetchSeasonBreakdown = async (teamId: string): Promise<TeamAdvancedStats | null> => {
  const {
    seasonStatsResult,
    allTeamSeasonStatsResult,
    currentMatchesResult,
    archivedMatchesResult,
    playoffMatchesResult,
  } = await fetchSeasonBreakdownQueries(teamId);

  if (seasonStatsResult.error) {
    handleDatabaseError(
      seasonStatsResult.error as PostgrestError,
      'Failed to fetch team season stats'
    );
  }

  if (allTeamSeasonStatsResult.error) {
    errorLog(
      'Failed to fetch all team season stats for division lookup:',
      allTeamSeasonStatsResult.error
    );
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

  const seasonStats = seasonStatsResult.data;
  const currentMatches = currentMatchesResult.data;
  const archivedMatches = archivedMatchesResult.data;
  const playoffMatchesRaw = playoffMatchesResult.data;

  const allMatches = [
    ...(Array.isArray(currentMatches) ? currentMatches : []),
    ...(Array.isArray(archivedMatches) ? archivedMatches : []),
  ];

  if (!seasonStats || seasonStats.length === 0) {
    return null;
  }

  const teamDivisionMap = buildTeamDivisionMap(allTeamSeasonStatsResult.data);

  const bracketIds = [
    ...new Set((playoffMatchesRaw || []).map((match) => match.bracket_id).filter(Boolean)),
  ] as string[];

  const { data: brackets, error: bracketsError } = await fetchBracketsByIds(bracketIds);
  if (bracketsError) {
    errorLog('Failed to fetch bracket info for season breakdown:', bracketsError);
  }

  const bracketInfoMap = buildBracketInfoMap(
    (brackets ?? []).map((b) => ({
      id: b.id,
      season_id: b.season_id,
      divisions: b.divisions ? { division_weight: b.divisions.division_weight ?? 0.85 } : null,
    }))
  );

  const playoffMatches = (playoffMatchesRaw || []).map((match) => ({
    ...match,
    bracketInfo: match.bracket_id ? bracketInfoMap[match.bracket_id] : null,
  }));

  const { matchesBySeason, playoffMatchesBySeason } = groupMatchesBySeason(
    allMatches,
    playoffMatches
  );

  const seasons: SeasonBreakdown[] = seasonStats.map((stat) =>
    buildSeasonBreakdown(stat, teamId, matchesBySeason, playoffMatchesBySeason, teamDivisionMap)
  );

  const seasonsWithPowerScore = seasons.filter((season) => season.powerScore !== null);
  const averagePowerScore =
    seasonsWithPowerScore.length > 0
      ? seasonsWithPowerScore.reduce((sum, season) => sum + (season.powerScore || 0), 0) /
        seasonsWithPowerScore.length
      : 0;

  const bestSeason =
    seasonsWithPowerScore.length > 0
      ? seasonsWithPowerScore.reduce((best, season) =>
          (season.powerScore || 0) > (best.powerScore || 0) ? season : best
        )
      : null;

  const worstSeason =
    seasonsWithPowerScore.length > 0
      ? seasonsWithPowerScore.reduce((worst, season) =>
          (season.powerScore || 0) < (worst.powerScore || 0) ? season : worst
        )
      : null;

  const powerScoreTrend = calculatePowerScoreTrend(seasonsWithPowerScore);
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

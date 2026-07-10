import type { PostgrestError } from '@supabase/supabase-js';

import { SeasonBreakdown, TeamAdvancedStats } from '@/types/teamAdvancedStats';
import { handleDatabaseError } from '@/utils/errorHandler';

import { buildSeasonBreakdown } from './assemblers';
import { calculateBestWorstDivisionTiers, calculatePowerScoreTrend } from './calculations';
import { buildBracketInfoMap, buildTeamDivisionMap, groupMatchesBySeason } from './mappers';
import { fetchBracketsByIds, fetchSeasonBreakdownQueries } from './queries';

/**
 * Fetch season-by-season breakdown stats for a team.
 * Returns null if no data exists.
 *
 * Database query failures throw so callers can handle data access errors consistently.
 * Returns null only when the primary season stats query succeeds with no rows.
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
    handleDatabaseError(
      allTeamSeasonStatsResult.error as PostgrestError,
      'Failed to fetch all team season stats for division lookup'
    );
  }
  if (currentMatchesResult.error) {
    handleDatabaseError(
      currentMatchesResult.error as PostgrestError,
      'Failed to fetch current matches for season breakdown'
    );
  }
  if (archivedMatchesResult.error) {
    handleDatabaseError(
      archivedMatchesResult.error as PostgrestError,
      'Failed to fetch archived matches for season breakdown'
    );
  }
  if (playoffMatchesResult.error) {
    handleDatabaseError(
      playoffMatchesResult.error as PostgrestError,
      'Failed to fetch playoff matches for season breakdown'
    );
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

  const { data: brackets, error: bracketsError } =
    bracketIds.length > 0 ? await fetchBracketsByIds(bracketIds) : { data: [], error: null };
  if (bracketsError) {
    handleDatabaseError(
      bracketsError as PostgrestError,
      'Failed to fetch bracket info for season breakdown'
    );
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

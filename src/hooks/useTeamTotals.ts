/**
 * @deprecated This file now re-exports from the modular career hooks.
 * Import directly from '@/hooks/career' for new code.
 *
 * Original 532-line god hook has been refactored into:
 * - src/utils/career/*.ts - Pure calculation functions
 * - src/hooks/career/useCareerData.ts - Data fetching
 * - src/hooks/career/useTeamTotalsComputed.ts - Composed hook
 */

import {
  calculateCareerMatchStats,
  calculateCareerPowerScore,
  calculateCareerSOS,
  calculateDivisionRecords,
  calculatePlayoffStats,
  calculateSweepRate,
} from '@/utils/career';
import { PlayoffFinish, TeamTotals } from '@/utils/career/types';

import { fetchCareerData } from './career/useCareerData';

// Backward compatibility - re-export hook from new modular structure
export { useTeamTotalsComputed as useTeamTotals } from './career/useTeamTotalsComputed';

// Re-export types for backward compatibility
export type { DivisionRecord, DivisionRecords, TeamTotals } from '@/utils/career/types';

/**
 * Backward compatible fetchTeamTotals function.
 * Fetches raw career data and computes totals.
 */
export const fetchTeamTotals = async (teamId: string): Promise<TeamTotals | null> => {
  const careerData = await fetchCareerData(teamId);

  if (!careerData) {
    return null;
  }

  const {
    seasonStats,
    currentMatches,
    archivedMatches,
    playoffMatches,
    teamDivisionMap,
    bracketDivisionWeights,
    teamDivisionWeight,
    currentSeasonId,
  } = careerData;

  // Calculate career match stats (exclude current season from seasonStats to avoid double-counting)
  const matchStats = calculateCareerMatchStats({
    seasonStats,
    currentMatches,
    teamId,
    currentSeasonId,
  });

  // Calculate playoff stats
  const playoffStats = calculatePlayoffStats({
    playoffMatches,
    bracketDivisionWeights,
    teamId,
  });

  // Calculate total matches for sweep rate
  const totalMatches = matchStats.career_match_wins + matchStats.career_match_losses;

  // Combine regular matches for sweep calculation
  const regularMatches = [
    ...(Array.isArray(currentMatches) ? currentMatches : []),
    ...(Array.isArray(archivedMatches) ? archivedMatches : []),
  ];

  // Calculate sweep rate
  const sweepStats = calculateSweepRate({
    regularMatches,
    playoffMatches,
    teamId,
    totalMatches,
  });

  // Calculate career SOS
  const career_sos = calculateCareerSOS(seasonStats);

  // Calculate division records
  const division_records = calculateDivisionRecords({
    currentMatches,
    archivedMatches,
    playoffMatches,
    teamDivisionMap,
    bracketDivisionWeights,
    teamId,
  });

  // Count championships and runner-ups with their historical division names
  const championships = seasonStats?.filter((stat) => stat.champion).length || 0;
  const runner_ups = seasonStats?.filter((stat) => stat.runner_up).length || 0;

  // Extract division names for championships and runner-ups
  const championshipDivisions =
    seasonStats?.filter((stat) => stat.champion).map((stat) => stat.division_name || 'Unknown') ||
    [];

  const runnerUpDivisions =
    seasonStats?.filter((stat) => stat.runner_up).map((stat) => stat.division_name || 'Unknown') ||
    [];

  // Get playoff finishes (sorted by rank)
  const playoff_finishes: PlayoffFinish[] =
    seasonStats
      ?.filter((stat) => stat.playoff_rank)
      .map((stat) => ({
        rank: stat.playoff_rank!,
        season_name: stat.seasons?.name || 'Unknown Season',
        division_name: stat.division_name || 'Unknown',
      }))
      .sort((a, b) => a.rank - b.rank) || [];

  // Calculate career power score (requires database access)
  const career_power_score = await calculateCareerPowerScore({
    teamId,
    championshipDivisions,
    runnerUpDivisions,
    careerPlayoffWins: playoffStats.career_playoff_wins,
    careerPlayoffLosses: playoffStats.career_playoff_losses,
    competitivePlayoffWins: playoffStats.competitive_playoff_wins,
    teamDivisionWeight,
  });

  return {
    ...matchStats,
    ...playoffStats,
    championships,
    runner_ups,
    playoff_finishes,
    career_power_score,
    ...sweepStats,
    career_sos,
    division_records,
  };
};

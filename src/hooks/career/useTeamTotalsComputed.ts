import { useQuery } from '@tanstack/react-query';

import {
  calculateCareerClutchRate,
  calculateCareerMatchStats,
  calculateCareerPowerScore,
  calculateCareerSOS,
  calculateDivisionRecords,
  calculatePlayoffStats,
  calculateSweepRate,
} from '@/utils/career';
import { calculatePlayoffConsistency } from '@/utils/career/calculatePlayoffNarratives';
import { PlayoffFinish, TeamTotals } from '@/utils/career/types';

import { fetchCareerData } from './useCareerData';

/**
 * Computes team career totals from raw career data.
 * Uses parallel database fetch + pure calculation functions.
 */
const computeTeamTotals = async (teamId: string): Promise<TeamTotals | null> => {
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

  // Calculate total matches for sweep rate (include playoff matches in denominator)
  const totalMatches =
    matchStats.career_match_wins +
    matchStats.career_match_losses +
    playoffStats.career_playoff_wins +
    playoffStats.career_playoff_losses;

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

  // Calculate career clutch rate
  const clutchStats = calculateCareerClutchRate({
    regularMatches,
    playoffMatches,
    teamId,
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

  // Calculate playoff consistency
  const playoff_consistency = calculatePlayoffConsistency(seasonStats);

  return {
    ...matchStats,
    ...playoffStats,
    championships,
    runner_ups,
    playoff_finishes,
    career_power_score,
    ...sweepStats,
    ...clutchStats,
    career_sos,
    division_records,
    playoff_consistency,
  };
};

/**
 * Hook for fetching and computing team career totals.
 * Uses modular calculation utilities for testability.
 */
export const useTeamTotalsComputed = (teamId: string) => {
  const query = useQuery({
    queryKey: ['team-totals', teamId],
    queryFn: () => (teamId ? computeTeamTotals(teamId) : Promise.resolve(null)),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes - career stats change rarely
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false, // Trust the cache
    refetchOnWindowFocus: false,
  });

  return {
    totals: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};

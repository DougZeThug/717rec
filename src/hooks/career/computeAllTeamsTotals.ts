import { Team } from '@/types';
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
import { errorLog } from '@/utils/logger';

import { BulkTeamCareerData, fetchAllTeamsCareerData } from './useCareerData';

/**
 * Computes TeamTotals for a single team from pre-fetched bulk data.
 * All calculation functions are pure (no DB access).
 * The only async call is calculateCareerPowerScore, which receives pre-fetched data.
 */
async function computeTotalsFromBulkData(
  teamId: string,
  data: BulkTeamCareerData,
  currentTeamPowerData: {
    power_score: number | null;
    wins: number | null;
    losses: number | null;
  } | null
): Promise<TeamTotals> {
  const {
    seasonStats,
    currentMatches,
    archivedMatches,
    playoffMatches,
    teamDivisionMap,
    bracketDivisionWeights,
    bracketSeasonMap,
    teamDivisionWeight,
    currentSeasonId,
    seasonPowerScores,
  } = data;

  // Calculate career match stats
  const matchStats = calculateCareerMatchStats({
    seasonStats,
    currentMatches,
    teamId,
    currentSeasonId,
    playoffMatches,
    bracketSeasonMap,
  });

  // Calculate playoff stats
  const playoffStats = calculatePlayoffStats({
    playoffMatches,
    bracketDivisionWeights,
    teamId,
  });

  const totalMatches =
    matchStats.career_match_wins +
    matchStats.career_match_losses +
    playoffStats.career_playoff_wins +
    playoffStats.career_playoff_losses;

  const regularMatches = [
    ...(Array.isArray(currentMatches) ? currentMatches : []),
    ...(Array.isArray(archivedMatches) ? archivedMatches : []),
  ];

  const sweepStats = calculateSweepRate({
    regularMatches,
    playoffMatches,
    teamId,
    totalMatches,
  });

  const clutchStats = calculateCareerClutchRate({
    regularMatches,
    playoffMatches,
    teamId,
  });

  const career_sos = calculateCareerSOS(seasonStats);

  const division_records = calculateDivisionRecords({
    currentMatches,
    archivedMatches,
    playoffMatches,
    teamDivisionMap,
    bracketDivisionWeights,
    teamId,
  });

  const championships = seasonStats?.filter((stat) => stat.champion).length || 0;
  const runner_ups = seasonStats?.filter((stat) => stat.runner_up).length || 0;

  const championshipDivisions =
    seasonStats?.filter((stat) => stat.champion).map((stat) => stat.division_name || 'Unknown') ||
    [];

  const runnerUpDivisions =
    seasonStats?.filter((stat) => stat.runner_up).map((stat) => stat.division_name || 'Unknown') ||
    [];

  const playoff_finishes: PlayoffFinish[] =
    seasonStats
      ?.filter((stat) => stat.playoff_rank)
      .map((stat) => ({
        rank: stat.playoff_rank!,
        season_name: stat.seasons?.name || 'Unknown Season',
        division_name: stat.division_name || 'Unknown',
      }))
      .sort((a, b) => a.rank - b.rank) || [];

  // Pass pre-fetched data so calculateCareerPowerScore skips its 2 DB queries
  const career_power_score = await calculateCareerPowerScore({
    teamId,
    championshipDivisions,
    runnerUpDivisions,
    careerPlayoffWins: playoffStats.career_playoff_wins,
    careerPlayoffLosses: playoffStats.career_playoff_losses,
    competitivePlayoffWins: playoffStats.competitive_playoff_wins,
    teamDivisionWeight,
    currentSeasonId,
    prefetchedSeasonStats: seasonPowerScores,
    prefetchedCurrentTeamData: currentTeamPowerData,
  });

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
}

/**
 * Fetches and computes career totals for ALL teams in a small fixed number of queries.
 * Replaces the N+1 pattern of calling fetchTeamTotals per team.
 *
 * @param teams - Array of Team objects (from useTeamsQuery, includes power_score/wins/losses)
 * @returns Map from teamId → TeamTotals
 */
export const computeAllTeamsTotals = async (teams: Team[]): Promise<Map<string, TeamTotals>> => {
  const teamIds = teams.map((t) => t.id);

  // Single bulk fetch: ~9 queries total regardless of team count
  const bulkData = await fetchAllTeamsCareerData(teamIds);

  // Build power score lookup from the teams array (already fetched from v_team_details)
  const teamPowerDataMap = new Map<
    string,
    { power_score: number | null; wins: number | null; losses: number | null }
  >();
  for (const team of teams) {
    teamPowerDataMap.set(team.id, {
      power_score: team.power_score ?? null,
      wins: team.wins ?? null,
      losses: team.losses ?? null,
    });
  }

  // Compute totals for each team (all pure computation, no DB access)
  const results = new Map<string, TeamTotals>();
  const promises = teamIds.map(async (teamId) => {
    const data = bulkData.get(teamId);
    if (!data) return;

    try {
      const totals = await computeTotalsFromBulkData(
        teamId,
        data,
        teamPowerDataMap.get(teamId) || null
      );
      results.set(teamId, totals);
    } catch (error) {
      errorLog(`Error computing career totals for team ${teamId}:`, error);
    }
  });

  await Promise.all(promises);
  return results;
};

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
 *
 * Every calculation here is pure except one: calculateCareerPowerScore. The
 * pre-fetched data saves it two queries, but it still reads the live division
 * weights, so it can throw — and it throws for every team at once, because they
 * all await the same memoised fetch. computeAllTeamsTotals below is where that
 * matters.
 */
export async function computeTotalsFromBulkData(
  teamId: string,
  data: BulkTeamCareerData,
  currentTeamPowerData: {
    power_score: number | null;
    career_power_score?: number | null;
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
    bracketDivisionDisplayNames,
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

  // career_match_wins/losses already includes playoff matches (via the
  // v_team_season_agg view for historical seasons and explicit addition
  // for the current season), so we must NOT add career_playoff_* again.
  const totalMatches = matchStats.career_match_wins + matchStats.career_match_losses;

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
    bracketDivisionDisplayNames,
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
      ?.filter((stat): stat is typeof stat & { playoff_rank: number } => stat.playoff_rank != null)
      .map((stat) => ({
        rank: stat.playoff_rank,
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
    playoffDivisions: playoff_finishes.map((finish) => finish.division_name),
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
    {
      power_score: number | null;
      career_power_score: number | null;
      wins: number | null;
      losses: number | null;
    }
  >();
  for (const team of teams) {
    teamPowerDataMap.set(team.id, {
      power_score: team.power_score ?? null,
      career_power_score: team.career_power_score ?? null,
      wins: team.wins ?? null,
      losses: team.losses ?? null,
    });
  }

  // Compute totals for each team. Mostly arithmetic on the bulk data above,
  // but not purely: the career power score reads the live division weights,
  // which is a database call and can throw.
  const results = new Map<string, TeamTotals>();
  let attempted = 0;
  let lastError: unknown = null;
  const promises = teamIds.map(async (teamId) => {
    const data = bulkData.get(teamId);
    if (!data) return;

    attempted++;
    try {
      const totals = await computeTotalsFromBulkData(
        teamId,
        data,
        teamPowerDataMap.get(teamId) || null
      );
      results.set(teamId, totals);
    } catch (error) {
      errorLog(`Error computing career totals for team ${teamId}:`, error);
      lastError = error;
    }
  });

  await Promise.all(promises);

  // One team dropping out is ordinary — it has data the others do not. Every
  // team dropping out is not: that is the division-weights read failing, and
  // the shared promise behind it rejects for all of them at once. Swallowing
  // it handed useCareerRankings an empty Map, which it reported as a league
  // with no teams: no error, no Try Again, and the query recorded as a success.
  // A failed fetch is not an empty one — the same rule as B-36, one layer down.
  if (attempted > 0 && results.size === 0) {
    throw lastError;
  }

  return results;
};

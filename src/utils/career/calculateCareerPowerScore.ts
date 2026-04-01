import { CareerQueryService } from '@/services/career/CareerQueryService';

interface SeasonPowerScoreData {
  power_score: number | null;
  match_wins: number | null;
  match_losses: number | null;
  season_id?: string | null;
}

interface CurrentTeamPowerData {
  power_score: number | null;
  wins: number | null;
  losses: number | null;
}

interface CareerPowerScoreInput {
  teamId: string;
  championshipDivisions: string[];
  runnerUpDivisions: string[];
  careerPlayoffWins: number;
  careerPlayoffLosses: number;
  competitivePlayoffWins: number;
  teamDivisionWeight: number;
  // Current season ID — used to exclude current season from team_season_stats
  // so it isn't double-counted with v_team_details data
  currentSeasonId?: string | null;
  // Optional pre-fetched data to avoid redundant DB queries (used by batch mode)
  prefetchedSeasonStats?: SeasonPowerScoreData[] | null;
  prefetchedCurrentTeamData?: CurrentTeamPowerData | null;
}

/**
 * Gets championship weight based on division name.
 * Matches the 4 playoff division tiers.
 */
const getChampionshipWeight = (divisionName: string): number => {
  const name = divisionName.toLowerCase();
  // Competitive playoff (weight 1.0)
  if (name.includes('competitive')) return 1.0;
  // Intermediate High playoff (weight 0.70)
  if (name.includes('intermediate high') || name.includes('intermediate 1') || name === 'cuspers')
    return 0.7;
  // Intermediate Low playoff (weight 0.45)
  if (
    name.includes('intermediate low') ||
    name.includes('intermediate 2') ||
    name === 'intermediate'
  )
    return 0.45;
  // Recreational (weight 0.25)
  return 0.25;
};

/**
 * Calculates career power score as weighted average of season power scores + playoff bonuses.
 * Accepts optional pre-fetched data to skip DB queries when called in batch mode.
 */
export const calculateCareerPowerScore = async ({
  teamId,
  championshipDivisions,
  runnerUpDivisions,
  careerPlayoffWins,
  careerPlayoffLosses,
  competitivePlayoffWins,
  teamDivisionWeight,
  currentSeasonId,
  prefetchedSeasonStats,
  prefetchedCurrentTeamData,
}: CareerPowerScoreInput): Promise<number> => {
  let seasonStats: SeasonPowerScoreData[] | null;
  let currentTeamData: CurrentTeamPowerData | null;
  let resolvedCurrentSeasonId = currentSeasonId;

  if (prefetchedSeasonStats !== undefined && prefetchedCurrentTeamData !== undefined) {
    // Use pre-fetched data (batch mode) — no DB queries needed
    seasonStats = prefetchedSeasonStats;
    currentTeamData = prefetchedCurrentTeamData;
  } else {
    // Fetch from DB (single-team mode — backward compatible)
    const [seasonStatsResult, currentTeamDataResult, fetchedSeasonId] = await Promise.all([
      CareerQueryService.fetchTeamSeasonPowerScores(teamId),
      CareerQueryService.fetchCurrentTeamPower(teamId),
      !resolvedCurrentSeasonId
        ? CareerQueryService.fetchActiveSeasonId()
        : Promise.resolve(null),
    ]);

    seasonStats = seasonStatsResult;
    currentTeamData = currentTeamDataResult;
    if (!resolvedCurrentSeasonId && fetchedSeasonId) {
      resolvedCurrentSeasonId = fetchedSeasonId;
    }
  }

  // Exclude the current season from team_season_stats to avoid double-counting
  // with v_team_details (which also represents the current season)
  const historicalStats = resolvedCurrentSeasonId
    ? seasonStats?.filter((s) => s.season_id !== resolvedCurrentSeasonId)
    : seasonStats;

  // Calculate weighted average of season power scores (no division penalties)
  let totalWeightedScore = 0;
  let totalMatches = 0;

  // Add historical season data (power scores are already on 0-1 scale, multiply by 100)
  if (historicalStats && historicalStats.length > 0) {
    for (const season of historicalStats) {
      const seasonMatches = (season.match_wins || 0) + (season.match_losses || 0);
      if (seasonMatches > 0 && season.power_score !== null) {
        totalWeightedScore += season.power_score * 100 * seasonMatches;
        totalMatches += seasonMatches;
      }
    }
  }

  // Add current season data if available (power score already on 0-100 scale)
  if (
    currentTeamData &&
    currentTeamData.power_score !== null &&
    currentTeamData.wins !== null &&
    currentTeamData.losses !== null
  ) {
    const currentSeasonMatches = (currentTeamData.wins || 0) + (currentTeamData.losses || 0);
    if (currentSeasonMatches > 0) {
      totalWeightedScore += currentTeamData.power_score * currentSeasonMatches;
      totalMatches += currentSeasonMatches;
    }
  }

  // Base career score is the weighted average (no division penalties applied)
  const baseCareerScore = totalMatches > 0 ? totalWeightedScore / totalMatches : 50;

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
  const totalPlayoffBonus = Math.min(
    15,
    championshipBonus + runnerUpBonus + otherPlayoffBonus + competitivePlayoffBonus
  );

  // Final career power score
  return Math.min(100, baseCareerScore + totalPlayoffBonus);
};

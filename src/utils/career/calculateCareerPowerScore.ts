import { CareerQueryService } from '@/services/career/CareerQueryService';
import { fetchDivisionWeightsByName } from '@/utils/rankingUtils/divisionWeightsCache';

import { averageDivisionBonusWeight, resolveDivisionBonusWeight } from './divisionBonusWeight';

interface SeasonPowerScoreData {
  power_score: number | null;
  /** Floored (earned-schedule) value. Career uses this when present. */
  career_power_score?: number | null;
  match_wins: number | null;
  match_losses: number | null;
  season_id?: string | null;
}

interface CurrentTeamPowerData {
  power_score: number | null;
  career_power_score?: number | null;
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
  // Division names of the seasons the team actually reached the playoffs in.
  // Used so an old playoff run is rated by the division it happened in,
  // not by the division the team sits in today.
  playoffDivisions?: string[];
  // Current season ID — used to exclude current season from team_season_stats
  // so it isn't double-counted with v_team_details data
  currentSeasonId?: string | null;
  // Optional pre-fetched data to avoid redundant DB queries (used by batch mode)
  prefetchedSeasonStats?: SeasonPowerScoreData[] | null;
  prefetchedCurrentTeamData?: CurrentTeamPowerData | null;
}

type CareerSourceInput = Pick<
  CareerPowerScoreInput,
  'teamId' | 'currentSeasonId' | 'prefetchedSeasonStats' | 'prefetchedCurrentTeamData'
>;

interface CareerSourceData {
  seasonStats: SeasonPowerScoreData[] | null;
  currentTeamData: CurrentTeamPowerData | null;
  currentSeasonId: string | null | undefined;
}

/**
 * Uses the pre-fetched rows (batch mode) when BOTH were given. Otherwise reads
 * them from the database, and looks up the active season if none was passed.
 */
const loadCareerSourceData = async ({
  teamId,
  currentSeasonId,
  prefetchedSeasonStats,
  prefetchedCurrentTeamData,
}: CareerSourceInput): Promise<CareerSourceData> => {
  if (prefetchedSeasonStats !== undefined && prefetchedCurrentTeamData !== undefined) {
    // Use pre-fetched data (batch mode) — no DB queries needed
    return {
      seasonStats: prefetchedSeasonStats,
      currentTeamData: prefetchedCurrentTeamData,
      currentSeasonId,
    };
  }

  // Fetch from DB (single-team mode — backward compatible)
  const [seasonStats, currentTeamData, fetchedSeasonId] = await Promise.all([
    CareerQueryService.fetchTeamSeasonPowerScores(teamId),
    CareerQueryService.fetchCurrentTeamPower(teamId),
    !currentSeasonId ? CareerQueryService.fetchActiveSeasonId() : Promise.resolve(null),
  ]);

  return {
    seasonStats,
    currentTeamData,
    currentSeasonId: currentSeasonId || fetchedSeasonId,
  };
};

interface ScoreTotals {
  weightedScore: number;
  matches: number;
}

/** Adds one season's score, weighted by its matches. Rows with no matches or no score count for nothing. */
const addWeightedScore = (
  totals: ScoreTotals,
  score: number | null | undefined,
  matches: number,
  scale: number
): void => {
  if (matches <= 0 || score === null || score === undefined) return;
  totals.weightedScore += score * scale * matches;
  totals.matches += matches;
};

/**
 * Weighted average of season power scores (no division penalties).
 *
 * A team that has played nothing scores 0 and sits at the foot of the career
 * table. It used to be given 50, which placed it mid-table above teams with a
 * real losing record — a team that had never thrown a bag outranked teams that
 * had turned up and lost.
 */
const calculateBaseCareerScore = (
  historicalStats: SeasonPowerScoreData[] | null | undefined,
  currentTeamData: CurrentTeamPowerData | null
): number => {
  const totals: ScoreTotals = { weightedScore: 0, matches: 0 };

  // Historical season data (power scores are on 0-1 scale, multiply by 100)
  for (const season of historicalStats ?? []) {
    const seasonMatches = (season.match_wins || 0) + (season.match_losses || 0);
    // Prefer the career (floored) score; fall back to the standings score for
    // rows recorded before the two formulas were split.
    const seasonScore = season.career_power_score ?? season.power_score;
    addWeightedScore(totals, seasonScore, seasonMatches, 100);
  }

  // Current season data if available (power score already on 0-100 scale)
  if (currentTeamData && currentTeamData.wins !== null && currentTeamData.losses !== null) {
    const currentScore = currentTeamData.career_power_score ?? currentTeamData.power_score;
    const currentSeasonMatches = (currentTeamData.wins || 0) + (currentTeamData.losses || 0);
    addWeightedScore(totals, currentScore, currentSeasonMatches, 1);
  }

  return totals.matches > 0 ? totals.weightedScore / totals.matches : 0;
};

/**
 * Bonus for a list of finishes (titles or runner-ups). Each one earns
 * `points` scaled by the SQUARED live weight of the division it happened in,
 * so soft-field finishes cannot out-earn a hard schedule.
 */
const sumSquaredWeightBonus = (
  divisions: string[],
  points: number,
  weightsByName: Map<string, number>
): number => {
  let bonus = 0;
  for (const divName of divisions) {
    const weight = resolveDivisionBonusWeight(divName, weightsByName);
    bonus += points * weight * weight;
  }
  return bonus;
};

/** Win-rate bonus above 50%, scaled by the weight of the divisions the playoff runs happened in. */
const calculateOtherPlayoffBonus = (
  playoffWins: number,
  playoffLosses: number,
  playoffWeight: number
): number => {
  const totalPlayoffMatches = playoffWins + playoffLosses;
  const playoffWinRate = totalPlayoffMatches > 0 ? playoffWins / totalPlayoffMatches : 0;
  return Math.max(0, (playoffWinRate - 0.5) * 4 * playoffWeight);
};

/**
 * Total bonus cap, scaled by the strongest division the team earned bonuses in.
 * This prevents a pile of soft-division titles from reaching the same ceiling as
 * a Competitive championship. If no bonus-qualifying divisions exist, fall back to
 * the team's current division weight so the cap is still tied to a real division.
 */
const calculateBonusCap = (
  bonusDivisionNames: string[],
  teamDivisionWeight: number,
  weightsByName: Map<string, number>
): number => {
  const maxBonusWeight =
    bonusDivisionNames.length > 0
      ? Math.max(
          ...bonusDivisionNames.map((name) => resolveDivisionBonusWeight(name, weightsByName))
        )
      : teamDivisionWeight;
  return 15 * maxBonusWeight * maxBonusWeight;
};

/**
 * Calculates career power score as weighted average of season power scores + playoff bonuses.
 * Accepts optional pre-fetched data to skip DB queries when called in batch mode.
 *
 * Title and runner-up bonuses are scaled by the SQUARE of the live division
 * weight, so a title won in a soft field cannot out-earn a strong record made
 * against a hard schedule. Weights always come from the `divisions` table.
 *
 * The total bonus cap is also scaled by the strongest division the team earned
 * bonuses in, so three soft-division titles do not reach the same maximum as a
 * Competitive championship.
 */
export const calculateCareerPowerScore = async ({
  teamId,
  championshipDivisions,
  runnerUpDivisions,
  careerPlayoffWins,
  careerPlayoffLosses,
  competitivePlayoffWins,
  teamDivisionWeight,
  playoffDivisions,
  currentSeasonId,
  prefetchedSeasonStats,
  prefetchedCurrentTeamData,
}: CareerPowerScoreInput): Promise<number> => {
  const {
    seasonStats,
    currentTeamData,
    currentSeasonId: resolvedCurrentSeasonId,
  } = await loadCareerSourceData({
    teamId,
    currentSeasonId,
    prefetchedSeasonStats,
    prefetchedCurrentTeamData,
  });

  // Exclude the current season from team_season_stats to avoid double-counting
  // with v_team_details (which also represents the current season)
  const historicalStats = resolvedCurrentSeasonId
    ? seasonStats?.filter((s) => s.season_id !== resolvedCurrentSeasonId)
    : seasonStats;

  // Base career score is the weighted average (no division penalties applied).
  const baseCareerScore = calculateBaseCareerScore(historicalStats, currentTeamData);

  // Live division weights, keyed by name. Never hardcode these values.
  const weightsByName = await fetchDivisionWeightsByName();

  // Championship bonus — scaled by the SQUARED live weight of the division the
  // title was actually won in, so soft-field titles cannot out-earn a hard schedule.
  const championshipBonus = sumSquaredWeightBonus(championshipDivisions, 7, weightsByName);

  // Runner-up bonus — same squared scaling
  const runnerUpBonus = sumSquaredWeightBonus(runnerUpDivisions, 4, weightsByName);

  // Playoff performance bonus — rated by the divisions the playoff runs actually
  // happened in, falling back to the team's current division weight.
  const playoffWeight =
    averageDivisionBonusWeight(playoffDivisions ?? [], weightsByName) ?? teamDivisionWeight;
  const otherPlayoffBonus = calculateOtherPlayoffBonus(
    careerPlayoffWins,
    careerPlayoffLosses,
    playoffWeight
  );

  // Competitive playoff bonus: +0.5 for each win in competitive division playoffs
  const competitivePlayoffBonus = competitivePlayoffWins * 0.5;

  const bonusCap = calculateBonusCap(
    [...championshipDivisions, ...runnerUpDivisions, ...(playoffDivisions ?? [])],
    teamDivisionWeight,
    weightsByName
  );

  // Total playoff bonus (capped by division strength)
  const totalPlayoffBonus = Math.min(
    bonusCap,
    championshipBonus + runnerUpBonus + otherPlayoffBonus + competitivePlayoffBonus
  );

  // Final career power score
  return Math.min(100, baseCareerScore + totalPlayoffBonus);
};

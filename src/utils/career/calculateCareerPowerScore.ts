import { CareerQueryService } from '@/services/career/CareerQueryService';
import { fetchDivisionWeightsByName } from '@/utils/rankingUtils/divisionWeightsCache';

import { averageDivisionBonusWeight, resolveDivisionBonusWeight } from './divisionBonusWeight';

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
  // Division names of the seasons the team actually reached the playoffs in.
  // Used so an old playoff run is rated by the division it happened in,
  // not by the division the team sits in today.
  playoffDivisions?: string[];
  // Current season ID — used to exclude current season from team_season_stats
  // so it isn't double-counted with v_team_details data.
  // Omitting it does NOT mean the same thing in both modes: in single-team mode it
  // is resolved from seasons.is_active before the exclusion decision, whereas in
  // prefetched (batch) mode it is taken at face value. Only the resolved value is
  // null when no season is active — see the KNOWN GAP note below for what that
  // means during the archive window.
  currentSeasonId?: string | null;
  // Optional pre-fetched data to avoid redundant DB queries (used by batch mode)
  prefetchedSeasonStats?: SeasonPowerScoreData[] | null;
  prefetchedCurrentTeamData?: CurrentTeamPowerData | null;
}

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
      !resolvedCurrentSeasonId ? CareerQueryService.fetchActiveSeasonId() : Promise.resolve(null),
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

  // Add current season data if available (power score already on 0-100 scale).
  //
  // KNOWN GAP — between partial_archive_season and finalize_playoffs no season is
  // is_active, so resolvedCurrentSeasonId is null and nothing was excluded above,
  // yet v_team_details still reports that season's playoff record because
  // current_standings_season_id() falls back to playoffs_active.
  //
  // Whether that is a double count depends on how fresh the stored row is, and the
  // stored row's freshness is not guaranteed: upsert_team_season_stats() runs on
  // archive/finalize and on regular-match RPCs, but the playoff write path
  // (usePlayoffActions -> updatePlayoffMatchResult) writes playoff_matches
  // directly and never refreshes it.
  //   - Playoffs finished before the archive: the stored row is playoff-inclusive,
  //     and adding v_team_details counts those games twice.
  //   - Archive before the playoffs are played: the stored row is regular-only,
  //     and adding v_team_details is the only way those games are counted at all.
  //
  // Gating this on resolvedCurrentSeasonId fixes the first case and breaks the
  // second, so it is deliberately NOT gated here. The real fix is to refresh
  // team_season_stats when a playoff result is written, which makes the stored row
  // always authoritative; then this block can be gated safely.
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

  // Live division weights, keyed by name. Never hardcode these values.
  const weightsByName = await fetchDivisionWeightsByName();

  // Championship bonus — scaled by the SQUARED live weight of the division the
  // title was actually won in, so soft-field titles cannot out-earn a hard schedule.
  let championshipBonus = 0;
  for (const divName of championshipDivisions) {
    const weight = resolveDivisionBonusWeight(divName, weightsByName);
    championshipBonus += 7 * weight * weight;
  }

  // Runner-up bonus — same squared scaling
  let runnerUpBonus = 0;
  for (const divName of runnerUpDivisions) {
    const weight = resolveDivisionBonusWeight(divName, weightsByName);
    runnerUpBonus += 4 * weight * weight;
  }

  // Playoff performance bonus — rated by the divisions the playoff runs actually
  // happened in, falling back to the team's current division weight.
  const playoffWeight =
    averageDivisionBonusWeight(playoffDivisions ?? [], weightsByName) ?? teamDivisionWeight;
  const totalPlayoffMatches = careerPlayoffWins + careerPlayoffLosses;
  const playoffWinRate = totalPlayoffMatches > 0 ? careerPlayoffWins / totalPlayoffMatches : 0;
  const otherPlayoffBonus = Math.max(0, (playoffWinRate - 0.5) * 4 * playoffWeight);

  // Competitive playoff bonus: +0.5 for each win in competitive division playoffs
  const competitivePlayoffBonus = competitivePlayoffWins * 0.5;

  // Total bonus cap is scaled by the strongest division the team earned bonuses in.
  // This prevents a pile of soft-division titles from reaching the same ceiling as
  // a Competitive championship. If no bonus-qualifying divisions exist, fall back to
  // the team's current division weight so the cap is still tied to a real division.
  const bonusDivisionNames = [
    ...championshipDivisions,
    ...runnerUpDivisions,
    ...(playoffDivisions ?? []),
  ];
  const maxBonusWeight =
    bonusDivisionNames.length > 0
      ? Math.max(
          ...bonusDivisionNames.map((name) => resolveDivisionBonusWeight(name, weightsByName))
        )
      : teamDivisionWeight;
  const bonusCap = 15 * maxBonusWeight * maxBonusWeight;

  // Total playoff bonus (capped by division strength)
  const totalPlayoffBonus = Math.min(
    bonusCap,
    championshipBonus + runnerUpBonus + otherPlayoffBonus + competitivePlayoffBonus
  );

  // Final career power score
  return Math.min(100, baseCareerScore + totalPlayoffBonus);
};

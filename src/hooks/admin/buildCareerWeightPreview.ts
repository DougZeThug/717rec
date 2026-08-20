import {
  PowerScoreComponentRow,
  SeasonPowerScoreComponentRow,
} from '@/services/admin/PowerWeightSandboxService';
import { BulkTeamCareerData } from '@/services/career/CareerService';
import { Team } from '@/types';
import { powerScore100, powerScore100Career, PowerScoreWeights } from '@/utils/powerScore/weights';

import { computeTotalsFromBulkData } from '../career/computeAllTeamsTotals';

export interface CareerPreviewRow {
  teamId: string;
  teamName: string;
  divisionName: string | null;
  /** Career score under the baseline (live) triple */
  baselineScore: number;
  /** Career score under the candidate triple */
  candidateScore: number;
  baselineRank: number;
  candidateRank: number;
  /** baselineRank - candidateRank: positive means the team moves UP */
  rankDelta: number;
  scoreDelta: number;
}

export interface CareerWeightPreviewInput {
  /** All teams, hidden included — must match what /stats Career Rankings uses */
  teams: Team[];
  /** Live bulk career data from fetchAllTeamsCareerData(teamIds) */
  bulkData: Map<string, BulkTeamCareerData>;
  /** v_power_score_components rows (every team, every season) */
  seasonComponents: SeasonPowerScoreComponentRow[];
  /** v_power_score_components_current rows */
  currentComponents: PowerScoreComponentRow[];
  baseline: PowerScoreWeights;
  candidate: PowerScoreWeights;
}

/** Rank ids by score descending, team name as the stable tie-break. */
const rankByScore = (entries: { teamId: string; name: string; score: number }[]) => {
  const sorted = [...entries].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return new Map(sorted.map((entry, index) => [entry.teamId, index + 1]));
};

/**
 * One team's career score with every per-season and current-season power
 * score recomputed from the raw components under `weights`, then run through
 * the REAL career pipeline (computeTotalsFromBulkData: weighted average +
 * playoff bonuses), exactly like /stats. Scale rules follow the pipeline's
 * inputs: per-season rows are stored 0-1, current-team data is 0-100.
 * A season with no component row keeps its stored score.
 */
async function computeCareerScore(
  team: Team,
  liveData: BulkTeamCareerData,
  seasonComponentsByKey: Map<string, SeasonPowerScoreComponentRow>,
  currentByTeam: Map<string, PowerScoreComponentRow>,
  weights: PowerScoreWeights
): Promise<number> {
  const seasonPowerScores = (liveData.seasonPowerScores ?? []).map((season) => {
    const component = season.season_id
      ? seasonComponentsByKey.get(`${team.id}_${season.season_id}`)
      : undefined;
    if (!component || component.matches_played === 0) return season;
    return {
      ...season,
      power_score:
        powerScore100(
          component.weighted_win_pct,
          component.sos,
          component.weighted_game_win_pct,
          weights
        ) / 100,
      career_power_score:
        powerScore100Career(
          component.weighted_win_pct,
          component.sos,
          component.weighted_game_win_pct,
          weights
        ) / 100,
    };
  });

  const currentComponent = currentByTeam.get(team.id);
  const currentTeamData =
    currentComponent && currentComponent.matches_played > 0
      ? {
          power_score: powerScore100(
            currentComponent.weighted_win_pct,
            currentComponent.sos,
            currentComponent.weighted_game_win_pct,
            weights
          ),
          career_power_score: powerScore100Career(
            currentComponent.weighted_win_pct,
            currentComponent.sos,
            currentComponent.weighted_game_win_pct,
            weights
          ),
          wins: currentComponent.wins,
          losses: currentComponent.losses,
        }
      : {
          // No rated match this season: the current-season term contributes
          // nothing either way, so the stored v_team_details numbers stand in.
          power_score: team.power_score ?? null,
          career_power_score: team.career_power_score ?? null,
          wins: team.wins ?? null,
          losses: team.losses ?? null,
        };

  const totals = await computeTotalsFromBulkData(
    team.id,
    { ...liveData, seasonPowerScores },
    currentTeamData
  );
  return totals.career_power_score;
}

/**
 * Career standings under two weight triples. Both sides run the same live
 * data through the same pipeline — only the weight triple differs — so the
 * baseline side reproduces today's stored career ordering and the candidate
 * side shows exactly what a Save would publish.
 */
export async function buildCareerWeightPreview({
  teams,
  bulkData,
  seasonComponents,
  currentComponents,
  baseline,
  candidate,
}: CareerWeightPreviewInput): Promise<CareerPreviewRow[]> {
  const seasonComponentsByKey = new Map(
    seasonComponents.map((row) => [`${row.team_id}_${row.season_id}`, row])
  );
  const currentByTeam = new Map(currentComponents.map((row) => [row.team_id, row]));

  const scored: {
    teamId: string;
    name: string;
    divisionName: string | null;
    baselineScore: number;
    candidateScore: number;
  }[] = [];

  await Promise.all(
    teams.map(async (team) => {
      const liveData = bulkData.get(team.id);
      if (!liveData) return;

      const [baselineScore, candidateScore] = await Promise.all([
        computeCareerScore(team, liveData, seasonComponentsByKey, currentByTeam, baseline),
        computeCareerScore(team, liveData, seasonComponentsByKey, currentByTeam, candidate),
      ]);
      scored.push({
        teamId: team.id,
        name: team.name,
        divisionName: team.divisionName ?? null,
        baselineScore,
        candidateScore,
      });
    })
  );

  const baselineRanks = rankByScore(
    scored.map((s) => ({ teamId: s.teamId, name: s.name, score: s.baselineScore }))
  );
  const candidateRanks = rankByScore(
    scored.map((s) => ({ teamId: s.teamId, name: s.name, score: s.candidateScore }))
  );

  const rows: CareerPreviewRow[] = scored.map((s) => {
    const baselineRank = baselineRanks.get(s.teamId) as number;
    const candidateRank = candidateRanks.get(s.teamId) as number;
    return {
      teamId: s.teamId,
      teamName: s.name,
      divisionName: s.divisionName,
      baselineScore: s.baselineScore,
      candidateScore: s.candidateScore,
      baselineRank,
      candidateRank,
      rankDelta: baselineRank - candidateRank,
      scoreDelta: s.candidateScore - s.baselineScore,
    };
  });

  rows.sort((a, b) => a.candidateRank - b.candidateRank);
  return rows;
}

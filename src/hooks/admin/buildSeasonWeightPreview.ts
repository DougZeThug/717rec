import { PowerScoreComponentRow } from '@/services/admin/PowerWeightSandboxService';
import { Team } from '@/types';
import { powerScore100, PowerScoreWeights } from '@/utils/powerScore/weights';

interface SeasonPreviewRow {
  teamId: string;
  teamName: string;
  /** 0-100, computed from the live components under the baseline triple */
  baselineScore: number;
  /** 0-100, same components under the candidate triple */
  candidateScore: number;
  /** Rank within the division under the baseline triple (1 = best) */
  baselineRank: number;
  candidateRank: number;
  /** baselineRank - candidateRank: positive means the team moves UP */
  rankDelta: number;
  scoreDelta: number;
}

export interface SeasonDivisionPreview {
  divisionName: string;
  /** Sorted by candidateRank */
  rows: SeasonPreviewRow[];
  /** Teams with no rated match this season — no score under either triple */
  unrated: { teamId: string; teamName: string }[];
}

export interface SeasonWeightPreviewInput {
  /** All teams, hidden included (the UI decides what to show) */
  teams: Team[];
  /** v_power_score_components_current rows */
  components: PowerScoreComponentRow[];
  baseline: PowerScoreWeights;
  candidate: PowerScoreWeights;
}

/** Rank ids by score descending, team name as the stable tie-break. */
const rankByScore = (entries: { teamId: string; name: string; score: number }[]) => {
  const sorted = [...entries].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return new Map(sorted.map((entry, index) => [entry.teamId, index + 1]));
};

/**
 * Current-season standings under two weight triples, grouped by division.
 * Pure: the same v_team_details rule decides who is rated (a component row
 * with matches_played > 0), and both sides are computed locally from the
 * same components, so the baseline column reproduces the live standings
 * order exactly.
 */
export function buildSeasonWeightPreview({
  teams,
  components,
  baseline,
  candidate,
}: SeasonWeightPreviewInput): SeasonDivisionPreview[] {
  const componentsByTeam = new Map(components.map((row) => [row.team_id, row]));

  const teamsByDivision = new Map<string, Team[]>();
  for (const team of teams) {
    const division = team.divisionName ?? 'Unknown';
    let list = teamsByDivision.get(division);
    if (!list) {
      list = [];
      teamsByDivision.set(division, list);
    }
    list.push(team);
  }

  const previews: SeasonDivisionPreview[] = [];
  for (const [divisionName, divisionTeams] of teamsByDivision) {
    const rated: { team: Team; component: PowerScoreComponentRow }[] = [];
    const unrated: { teamId: string; teamName: string }[] = [];
    for (const team of divisionTeams) {
      const component = componentsByTeam.get(team.id);
      if (component && component.matches_played > 0) {
        rated.push({ team, component });
      } else {
        unrated.push({ teamId: team.id, teamName: team.name });
      }
    }

    const scored = rated.map(({ team, component }) => ({
      teamId: team.id,
      name: team.name,
      baselineScore: powerScore100(
        component.weighted_win_pct,
        component.sos,
        component.weighted_game_win_pct,
        baseline
      ),
      candidateScore: powerScore100(
        component.weighted_win_pct,
        component.sos,
        component.weighted_game_win_pct,
        candidate
      ),
    }));

    const baselineRanks = rankByScore(
      scored.map((s) => ({ teamId: s.teamId, name: s.name, score: s.baselineScore }))
    );
    const candidateRanks = rankByScore(
      scored.map((s) => ({ teamId: s.teamId, name: s.name, score: s.candidateScore }))
    );

    const rows: SeasonPreviewRow[] = scored.map((s) => {
      const baselineRank = baselineRanks.get(s.teamId) as number;
      const candidateRank = candidateRanks.get(s.teamId) as number;
      return {
        teamId: s.teamId,
        teamName: s.name,
        baselineScore: s.baselineScore,
        candidateScore: s.candidateScore,
        baselineRank,
        candidateRank,
        rankDelta: baselineRank - candidateRank,
        scoreDelta: s.candidateScore - s.baselineScore,
      };
    });
    rows.sort((a, b) => a.candidateRank - b.candidateRank);
    unrated.sort((a, b) => a.teamName.localeCompare(b.teamName));

    previews.push({ divisionName, rows, unrated });
  }

  previews.sort((a, b) => a.divisionName.localeCompare(b.divisionName));
  return previews;
}

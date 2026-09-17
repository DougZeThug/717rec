import { computeAllTeamsTotals } from '@/hooks/career/computeAllTeamsTotals';
import { fetchBatchHeadToHead, type HeadToHeadData } from '@/services/TeamCareerStatsService';
import type { Team } from '@/types';
import type { HeadToHeadStats, TeamStats } from '@/utils/predictions';
import { fetchDivisionWeights } from '@/utils/rankingUtils/divisionWeightsCache';

/**
 * Gathers everything `predictMatch` needs for the teams that played in one week.
 *
 * The schedule page already tags completed matches as upsets using
 * `predictMatch` (see `components/schedule/UpsetTag.tsx`). The recap used to use
 * a different, cruder rule, so the two screens could disagree about the same
 * match. This module feeds the recap the same inputs the schedule uses, from the
 * same sources, so they cannot.
 *
 * `computeAllTeamsTotals` lives under `hooks/career/` but is a plain async
 * function, not a hook. It is imported here rather than reimplemented so the
 * career numbers stay identical to the ones `useMatchPrediction` reads.
 */

/** The `v_team_details` columns the model needs. */
export interface PredictionTeamRow {
  team_id: string;
  power_score: number | null;
  sos: number | null;
  division_id: string | null;
  career_power_score: number | null;
  wins: number | null;
  losses: number | null;
}

export interface UpsetPredictionInputs {
  teamStats: Map<string, TeamStats>;
  divisionWeights: Map<string, number>;
  headToHead: Map<string, HeadToHeadData>;
}

/** Key a head-to-head lookup the same way fetchBatchHeadToHead stores it. */
export const h2hKey = (teamAId: string, teamBId: string): string => `${teamAId}-${teamBId}`;

export const toHeadToHeadStats = (data: HeadToHeadData | undefined): HeadToHeadStats | null =>
  data
    ? {
        team1Wins: data.team1Wins,
        team2Wins: data.team2Wins,
        totalMatches: data.totalMatches,
      }
    : null;

export async function fetchUpsetPredictionInputs(
  teamRows: PredictionTeamRow[],
  pairs: Array<{ team1: string; team2: string }>
): Promise<UpsetPredictionInputs> {
  // computeAllTeamsTotals reads id / power_score / career_power_score / wins /
  // losses off each Team. The rest of the Team shape is not touched.
  const teamsForCareer = teamRows.map(
    (row) =>
      ({
        id: row.team_id,
        power_score: row.power_score,
        career_power_score: row.career_power_score,
        wins: row.wins,
        losses: row.losses,
      }) as unknown as Team
  );

  const [divisionWeights, careerTotals, headToHead] = await Promise.all([
    fetchDivisionWeights(),
    computeAllTeamsTotals(teamsForCareer),
    pairs.length > 0
      ? fetchBatchHeadToHead(pairs)
      : Promise.resolve(new Map<string, HeadToHeadData>()),
  ]);

  const teamStats = new Map<string, TeamStats>();

  for (const row of teamRows) {
    const career = careerTotals.get(row.team_id);
    const careerMatches = career ? career.career_match_wins + career.career_match_losses : 0;

    teamStats.set(row.team_id, {
      power_score: row.power_score,
      sos: row.sos,
      division_id: row.division_id,
      career_power_score: career?.career_power_score ?? null,
      career_sos: career?.career_sos ?? null,
      career_win_percentage:
        career && careerMatches > 0 ? career.career_match_wins / careerMatches : null,
    });
  }

  return { teamStats, divisionWeights, headToHead };
}

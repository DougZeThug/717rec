import type { Ranking } from '@/types';

/**
 * One team's projected playoff seed, before any bracket exists.
 *
 * "Projected" because nothing is stored: the seed is the team's position in its
 * own division once the league-wide rankings are grouped. It moves every time a
 * result lands.
 */
export interface ProjectedSeed {
  seed: number;
  teamId: string;
  teamName: string;
  powerScore: number | null;
}

/**
 * Group ranked teams into per-division seed order, keyed by display division.
 *
 * The input order is taken as given and never re-sorted. That is deliberate:
 * `useTeamRankings` already sorts by displayed power score, then nulls last,
 * then division tier, then win %, then name — the same rule `bracket-creator.ts`
 * applies when an admin actually creates a bracket. Re-sorting here would risk
 * drifting from it, so projected seeds and real seeds stay in agreement by
 * construction.
 *
 * `divisionName` on a `Ranking` is already the *display* division (the view
 * coalesces it), so these keys line up with `availableDivisions` from
 * `usePlayoffPageData` without translation. Teams with no division are skipped.
 */
export const groupSeedsByDivision = (rankings: Ranking[]): Record<string, ProjectedSeed[]> => {
  const byDivision: Record<string, ProjectedSeed[]> = {};

  for (const ranking of rankings) {
    const division = ranking.divisionName;
    if (!division) continue;

    const seeds = (byDivision[division] ??= []);
    seeds.push({
      seed: seeds.length + 1,
      teamId: ranking.teamId,
      teamName: ranking.teamName,
      powerScore: ranking.powerScore ?? null,
    });
  }

  return byDivision;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * The week number the regular season ends on, or `null` when it cannot be known.
 *
 * There is no `playoff_start_week` column on `seasons` — only `start_date` and a
 * nullable `end_date` — so this is the best answer the data can give. The
 * arithmetic mirrors `useSeasonWeek` exactly (week 1 starts on `start_date`), so
 * "week 10" here means the same week the season badge would call week 10.
 *
 * Returns `null` when either date is missing or the end precedes the start; the
 * caller then drops the number rather than guessing one.
 */
export const getFinalRegularSeasonWeek = (
  startDate?: string | null,
  endDate?: string | null
): number | null => {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;

  // Round, not floor: both columns are date-only strings today, so the gap is an
  // exact number of days — but rounding keeps this right if the column ever
  // becomes a timestamp and a daylight-saving hour creeps in.
  const diffDays = Math.round((end - start) / MS_PER_DAY);
  if (diffDays < 0) return null;

  return Math.floor(diffDays / 7) + 1;
};

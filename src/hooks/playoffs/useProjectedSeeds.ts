import { useMemo } from 'react';

import { useActiveSeason, usePlayoffActiveSeason } from '@/hooks/useSeasons';
import { useTeamRankings } from '@/hooks/useTeamRankings';
import type { ProjectedSeed } from '@/utils/playoffs/projectedSeeds';
import { getFinalRegularSeasonWeek, groupSeedsByDivision } from '@/utils/playoffs/projectedSeeds';

export interface ProjectedSeedsResult {
  seedsByDivision: Record<string, ProjectedSeed[]>;
  finalWeek: number | null;
  /**
   * False while loading, on error, or when the chosen season is not the one the
   * live standings describe.
   */
  isReady: boolean;
}

const EMPTY_SEEDS: Record<string, ProjectedSeed[]> = {};

/**
 * Projected playoff seeds for the season shown on `/playoffs`.
 *
 * **The live season only.** Power scores come from `v_team_details`, which
 * carries no `season_id` — it is always the season the standings describe.
 * Showing those numbers against any other season would be quietly wrong, so
 * `isReady` is false then and the caller falls back to the plain "no brackets
 * yet" copy.
 *
 * Which season that is has to match the database, not just `is_active`:
 * `current_standings_season_id()` is the active season **falling back to the
 * season whose playoffs are still running**. `partial_archive_season` clears
 * `is_active` and sets `playoffs_active` in one step, so between that call and
 * the first bracket there is no active season at all — and the standings still
 * describe the season the page is showing.
 *
 * Mount this lazily. `useTeamRankings` fetches teams, matches and previous
 * rankings unconditionally — its optional arguments do not gate the requests and
 * it has no `enabled` option — so calling it on every `/playoffs` visit would add
 * a matches round trip to a page that is already slow to first paint. Rendering
 * the component that owns this hook only when a division has no brackets keeps
 * that cost where it belongs.
 */
export const useProjectedSeeds = (selectedSeasonId: string | null): ProjectedSeedsResult => {
  const { data: activeSeason, isLoading: activeLoading } = useActiveSeason();
  const { data: playoffSeason, isLoading: playoffLoading } = usePlayoffActiveSeason();
  const { rankings, isLoading: rankingsLoading, error } = useTeamRankings();

  // The same order `current_standings_season_id()` uses.
  const standingsSeason = activeSeason ?? playoffSeason ?? null;

  const isStandingsSeason = Boolean(
    selectedSeasonId && standingsSeason?.id && selectedSeasonId === standingsSeason.id
  );

  const seedsByDivision = useMemo(
    () => (isStandingsSeason && !error ? groupSeedsByDivision(rankings) : EMPTY_SEEDS),
    [isStandingsSeason, error, rankings]
  );

  const finalWeek = useMemo(
    () =>
      isStandingsSeason
        ? getFinalRegularSeasonWeek(standingsSeason?.start_date, standingsSeason?.end_date)
        : null,
    [isStandingsSeason, standingsSeason?.start_date, standingsSeason?.end_date]
  );

  return {
    seedsByDivision,
    finalWeek,
    isReady: isStandingsSeason && !activeLoading && !playoffLoading && !rankingsLoading && !error,
  };
};

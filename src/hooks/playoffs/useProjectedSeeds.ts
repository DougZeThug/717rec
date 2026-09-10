import { useMemo } from 'react';

import { useActiveSeason } from '@/hooks/useSeasons';
import { useTeamRankings } from '@/hooks/useTeamRankings';
import type { ProjectedSeed } from '@/utils/playoffs/projectedSeeds';
import { getFinalRegularSeasonWeek, groupSeedsByDivision } from '@/utils/playoffs/projectedSeeds';

export interface ProjectedSeedsResult {
  seedsByDivision: Record<string, ProjectedSeed[]>;
  finalWeek: number | null;
  /** False while loading, on error, or when the chosen season is not the active one. */
  isReady: boolean;
}

const EMPTY_SEEDS: Record<string, ProjectedSeed[]> = {};

/**
 * Projected playoff seeds for the season shown on `/playoffs`.
 *
 * **Active season only.** Power scores come from `v_team_details`, which carries
 * no `season_id` — it is always the season being played. Showing those numbers
 * against a past season would be quietly wrong, so `isReady` is false whenever
 * the chosen season is not the active one and the caller falls back to the plain
 * "no brackets yet" copy.
 *
 * Mount this lazily. `useTeamRankings` fetches teams, matches and previous
 * rankings unconditionally — its optional arguments do not gate the requests and
 * it has no `enabled` option — so calling it on every `/playoffs` visit would add
 * a matches round trip to a page that is already slow to first paint. Rendering
 * the component that owns this hook only when a division has no brackets keeps
 * that cost where it belongs.
 */
export const useProjectedSeeds = (selectedSeasonId: string | null): ProjectedSeedsResult => {
  const { data: activeSeason, isLoading: seasonLoading } = useActiveSeason();
  const { rankings, isLoading: rankingsLoading, error } = useTeamRankings();

  const isActiveSeason = Boolean(
    selectedSeasonId && activeSeason?.id && selectedSeasonId === activeSeason.id
  );

  const seedsByDivision = useMemo(
    () => (isActiveSeason && !error ? groupSeedsByDivision(rankings) : EMPTY_SEEDS),
    [isActiveSeason, error, rankings]
  );

  const finalWeek = useMemo(
    () =>
      isActiveSeason
        ? getFinalRegularSeasonWeek(activeSeason?.start_date, activeSeason?.end_date)
        : null,
    [isActiveSeason, activeSeason?.start_date, activeSeason?.end_date]
  );

  return {
    seedsByDivision,
    finalWeek,
    isReady: isActiveSeason && !seasonLoading && !rankingsLoading && !error,
  };
};

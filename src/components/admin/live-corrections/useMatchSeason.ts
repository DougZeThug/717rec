import { useSeasons } from '@/hooks/useSeasons';

interface MatchSeason {
  name: string | null;
  /** B-20: an archived season is frozen, so its rounds are read-only. */
  isArchived: boolean;
}

/**
 * The season a match belongs to, and whether it is frozen.
 *
 * Read from the match's own `season_id` rather than from the section's season
 * filter, because a selected match stays open when that filter changes.
 * `useSeasons` is already cached by the section, so this costs no request.
 */
export const useMatchSeason = (seasonId: string | null | undefined): MatchSeason => {
  const { data: seasons } = useSeasons();
  const season = (seasons ?? []).find((s) => s.id === seasonId);

  return { name: season?.name ?? null, isArchived: season?.is_archived === true };
};

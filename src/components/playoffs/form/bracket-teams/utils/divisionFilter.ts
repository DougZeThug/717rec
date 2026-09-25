import type { Division } from '@/types';

type DivisionLike = Pick<Division, 'id' | 'name' | 'display_division'>;

/** The display division a division is listed under ("Competitive High" → "Competitive"). */
const displayDivisionOf = (division: DivisionLike): string =>
  division.display_division || division.name;

/**
 * The teams of the display division `divisionId` belongs to. The bracket
 * form's division picker lists display divisions, so picking "Competitive"
 * covers every division shown as Competitive. Returns null for an unknown
 * division, so the caller can fall back to every team.
 */
export function teamsInDisplayDivision<T extends { division_id?: string | null }>(
  teams: T[],
  divisions: DivisionLike[],
  divisionId: string
): { label: string; teams: T[] } | null {
  const picked = divisions.find((division) => division.id === divisionId);
  if (!picked) return null;
  const label = displayDivisionOf(picked);
  const idsInGroup = new Set(
    divisions
      .filter((division) => displayDivisionOf(division) === label)
      .map((division) => division.id)
  );
  return {
    label,
    teams: teams.filter((team) => team.division_id != null && idsInGroup.has(team.division_id)),
  };
}

/**
 * Resolves a season's division name to the LIVE division weight.
 *
 * Weight values are never hardcoded here — they always come from the
 * `divisions` table (see src/utils/powerScore/README.md). Only the
 * name→row mapping lives in code, because `team_season_stats.division_name`
 * holds synthetic labels ("Intermediate 1"/"Intermediate 2") that match no
 * row in `divisions`.
 */

import { getDefaultDivisionWeight } from '@/utils/rankingUtils/divisionWeightsCache';

/** Synthetic season labels → the real `divisions.name` they represent. */
const DIVISION_NAME_ALIASES: Record<string, string> = {
  'intermediate 1': 'intermediate high',
  'intermediate 2': 'intermediate low',
  'competitive 1': 'competitive',
  'competitive 2': 'competitive low',
  'recreational 1': 'recreational high',
  'recreational 2': 'recreational',
};

const normalize = (name: string): string => name.trim().toLowerCase();

/**
 * Look up the live weight for a historical division name.
 * Falls back to the shared default weight when nothing resolves.
 */
export const resolveDivisionBonusWeight = (
  divisionName: string | null | undefined,
  weightsByName: Map<string, number>
): number => {
  if (!divisionName) return getDefaultDivisionWeight();

  const key = normalize(divisionName);

  // 1. Exact match against a live division name
  const exact = weightsByName.get(key);
  if (exact !== undefined) return exact;

  // 2. Known synthetic label
  const aliased = DIVISION_NAME_ALIASES[key];
  if (aliased !== undefined) {
    const weight = weightsByName.get(aliased);
    if (weight !== undefined) return weight;
  }

  // 3. Base tier word ("Intermediate 3" → "intermediate")
  const base = key.split(/\s+/)[0];
  const baseWeight = weightsByName.get(base);
  if (baseWeight !== undefined) return baseWeight;

  return getDefaultDivisionWeight();
};

/**
 * Average live weight across a set of season division names.
 * Returns null when nothing resolves, so callers can keep their own fallback.
 */
export const averageDivisionBonusWeight = (
  divisionNames: readonly (string | null | undefined)[],
  weightsByName: Map<string, number>
): number | null => {
  const resolved = divisionNames
    .filter((name): name is string => Boolean(name))
    .map((name) => resolveDivisionBonusWeight(name, weightsByName));

  if (resolved.length === 0) return null;
  return resolved.reduce((sum, weight) => sum + weight, 0) / resolved.length;
};
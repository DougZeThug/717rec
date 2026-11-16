/**
 * Resolves a season's division name to the LIVE division weight.
 *
 * Weight values are never hardcoded here — they always come from the
 * `divisions` table (see src/utils/powerScore/README.md). Only the
 * name→row mapping lives in code, because `team_season_stats.division_name`
 * holds synthetic labels ("Intermediate 1"/"Intermediate 2") that match no
 * row in `divisions`.
 */

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
 * Live division weights by name. A division with no weight is kept as `null`,
 * not dropped: it must stop the lookup below as "unrated", not fall through to
 * an alias or a base tier word.
 */
type DivisionWeightsByName = ReadonlyMap<string, number | null>;

/**
 * Look up the live weight for a historical division name.
 * Returns `null` ("unrated") for a blank name, a name that matches no division,
 * or a matched division with no weight. A stored weight of 0 is a real 0. The
 * career bonus leaves an unrated division out instead of guessing a weight.
 * The SQL twin returns the same (`resolve_division_bonus_weight`).
 */
export const resolveDivisionBonusWeight = (
  divisionName: string | null | undefined,
  weightsByName: DivisionWeightsByName
): number | null => {
  if (!divisionName) return null;

  const key = normalize(divisionName);

  // 1. Exact match against a live division name. A match with no weight
  // (null) is final: it must not fall through to the steps below.
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

  return null;
};

/**
 * The weights of the RATED season division names only. Blank and unknown names
 * and divisions with no weight are left out, so no `null` can reach a sum or
 * `Math.max` (`Math.max(null)` is 0 and `Math.max(undefined)` is NaN).
 */
const ratedWeights = (
  divisionNames: readonly (string | null | undefined)[],
  weightsByName: DivisionWeightsByName
): number[] =>
  divisionNames
    .map((name) => resolveDivisionBonusWeight(name, weightsByName))
    .filter((weight): weight is number => weight !== null);

/**
 * Average live weight across the RATED season division names.
 * Returns null when none is rated, so callers can choose their own fallback.
 */
export const averageDivisionBonusWeight = (
  divisionNames: readonly (string | null | undefined)[],
  weightsByName: DivisionWeightsByName
): number | null => {
  const rated = ratedWeights(divisionNames, weightsByName);

  if (rated.length === 0) return null;
  return rated.reduce((sum, weight) => sum + weight, 0) / rated.length;
};

/**
 * Highest live weight across the RATED season division names.
 * Returns null when none is rated, so callers can choose their own fallback.
 */
export const maxDivisionBonusWeight = (
  divisionNames: readonly (string | null | undefined)[],
  weightsByName: DivisionWeightsByName
): number | null => {
  const rated = ratedWeights(divisionNames, weightsByName);

  if (rated.length === 0) return null;
  return Math.max(...rated);
};

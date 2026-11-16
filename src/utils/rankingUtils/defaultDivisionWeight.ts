/**
 * TEMPORARY FALLBACK. The bracket and Team page code use this value when a
 * division weight is missing, and so does the by-id weights cache (match
 * predictions). It is not an endorsed league-strength value.
 *
 * The career bonus does NOT use it any more. There, a blank name, a name that
 * matches no division, or a division with no weight is UNRATED (null) and adds
 * 0, like the season Power Score does for an unrated opponent (Doug, 2026-11-13).
 * See `resolveDivisionBonusWeight` (divisionBonusWeight.ts) and the team weight
 * in CareerFetchService and CareerBulkFetchService, which keep null now. The SQL
 * twin of the career bonus follows the same rule: they must change together.
 *
 * Where it is still used: the bracket weight (`||` in CareerFetchService and
 * calculatePlayoffStats, `??` in CareerBulkFetchService), the Team page tier
 * (teamSeasonStats calculations, mappers and fetchSeasonBreakdown) and the by-id
 * cache in divisionWeightsCache.
 *
 * - The value must stay 0.85.
 * - The value must stay BELOW 0.89. That is the competitive-playoff threshold in
 *   calculatePlayoffStats.ts and teamSeasonStats/calculations.ts, and in SQL.
 * - Two applied migrations have a stale path comment for this constant. A
 *   migration that has run cannot be edited.
 * - The match predictions keep their own copy in
 *   src/utils/predictions/predictionConstants.ts. That is on purpose.
 */
export const DEFAULT_DIVISION_WEIGHT = 0.85;

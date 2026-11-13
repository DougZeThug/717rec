/**
 * TEMPORARY FALLBACK. The career code and the Team page code use this value
 * only when a division weight is missing. It is not an endorsed league-strength
 * value.
 *
 * Per a live read Doug shared on 2026-11-13, no live division weight is 0.85.
 * Doug also decided on 2026-11-13 that a genuinely unknown division must be
 * treated as UNRATED. That means it is left out of the career bonus, like the
 * season Power Score does. That is DECIDED, NOT BUILT (see the corrections log
 * in docs/agents/LEAGUE_CONTEXT.md).
 *
 * Until then:
 * - The value must stay 0.85.
 * - The value must stay BELOW 0.89. That is the competitive-playoff threshold in
 *   calculatePlayoffStats.ts and teamSeasonStats/calculations.ts, and in SQL.
 * - SQL keeps its own copy of 0.85 in the functions
 *   `resolve_division_bonus_weight()` and `calculate_career_power_score()`.
 *   supabase/tests/career_power_score_parity.sql pins it. TypeScript and SQL
 *   must change together.
 * - An applied migration has a stale path comment for this constant. A migration
 *   that has run cannot be edited.
 * - The match predictions keep their own copy in
 *   src/utils/predictions/predictionConstants.ts. That is on purpose.
 */
export const DEFAULT_DIVISION_WEIGHT = 0.85;

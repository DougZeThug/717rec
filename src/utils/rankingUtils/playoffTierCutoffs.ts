/**
 * A playoff bracket is Competitive when its division weight is at or above this
 * value (the test is `>=`). SQL keeps its own copy of the 0.89 in
 * supabase/migrations/20261117120000_unrated_division_career_bonus.sql.
 */
export const COMPETITIVE_PLAYOFF_MIN_WEIGHT = 0.89;

/**
 * A playoff bracket is Intermediate when its division weight is at or above this
 * value and below the Competitive cut-off (the test is `>=`). Only the Team page
 * uses it. SQL has no copy of this one.
 */
export const INTERMEDIATE_PLAYOFF_MIN_WEIGHT = 0.4;

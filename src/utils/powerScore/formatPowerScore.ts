/**
 * Format power score for display
 * Expects 0-100 scale input (from v_team_details view)
 *
 * power_score is nullable: the view returns NULL for a team that has not played
 * and for Hidden-division teams, so null must be handled here as well as
 * undefined.
 */
export const formatPowerScore = (powerScore: number | null | undefined): string => {
  if (powerScore === null || powerScore === undefined) return '—';
  return powerScore.toFixed(1);
};

/**
 * The power score a team shows as, returned as a number instead of a string.
 *
 * Sorting uses this so that two teams printed the same are treated as tied and
 * fall through to the documented tiebreakers (division, then win percentage,
 * then name) — see docs/product-description/stats/standings-and-rankings.md.
 *
 * It must round exactly the way `formatPowerScore` above does. `toFixed(1)`
 * and `Math.round(x * 10) / 10` are NOT the same function: they disagree
 * wherever the stored double sits just under a `.x5` boundary, e.g. 41.65
 * prints as "41.6" but rounds to 41.7. Sorting on the second rule skipped the
 * tiebreakers on rows the standings had already shown as tied.
 */
export const getDisplayedPowerScore = (powerScore: number | null | undefined): number | null => {
  if (powerScore === null || powerScore === undefined) return null;
  return Number(powerScore.toFixed(1));
};

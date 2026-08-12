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

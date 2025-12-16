/**
 * Format power score for display
 * Expects 0-100 scale input (from v_team_details view)
 */
export const formatPowerScore = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return '—';
  return powerScore.toFixed(1);
};

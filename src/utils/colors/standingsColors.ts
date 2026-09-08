/**
 * Colour for a percentage shown in the standings, on the 0-100 scale the table
 * and the phone cards both use.
 *
 * Deliberately separate from `getWinPercentageColor`, which works on a 0-1
 * scale and breaks at 45 rather than 40. The standings had this chain written
 * out four times — twice in the desktop row and twice in the phone card — so
 * the two views could drift apart.
 */
export const getStandingsPercentageColor = (percentage: number): string => {
  if (percentage >= 75) return 'text-green-600 dark:text-green-500';
  if (percentage >= 60) return 'text-blue-600 dark:text-blue-500';
  if (percentage >= 40) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-500';
};

import { championshipThresholds } from './thresholds';

/**
 * Get color classes for championship count display
 */
export const getChampionshipColor = (count: number): string => {
  if (count >= championshipThresholds.multiple) {
    return 'text-yellow-600 dark:text-yellow-500 font-semibold';
  }
  if (count >= championshipThresholds.single) {
    return 'text-yellow-700 dark:text-yellow-400 font-medium';
  }
  return 'text-muted-foreground';
};

/**
 * Get background color classes for championship count display
 */
export const getChampionshipBackgroundColor = (count: number): string => {
  if (count >= championshipThresholds.multiple) {
    return 'bg-yellow-100 dark:bg-yellow-900/20';
  }
  if (count >= championshipThresholds.single) {
    return 'bg-yellow-50 dark:bg-yellow-900/10';
  }
  return '';
};

/**
 * Get special styling for runner-up count
 */
export const getRunnerUpColor = (count: number): string => {
  // Three shades of grey used to separate these buckets: gray-600 at three or
  // more, gray-600 again at one, gray-500 at none. The middle two were the same
  // colour, and gray-500 measured 4.83:1 in the light theme, under the 4.5:1
  // minimum once the page is off-white. Weight carries the distinction now, and
  // the colour is the muted token in every theme.
  if (count >= 3) {
    return 'text-muted-foreground font-medium';
  }
  return 'text-muted-foreground';
};

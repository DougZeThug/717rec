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
  return 'text-gray-600 dark:text-gray-400';
};

/**
 * Get special styling for runner-up count
 */
export const getRunnerUpColor = (count: number): string => {
  if (count >= 3) {
    return 'text-gray-600 dark:text-gray-400 font-medium';
  }
  if (count >= 1) {
    return 'text-gray-600 dark:text-gray-400';
  }
  return 'text-gray-500 dark:text-gray-500';
};

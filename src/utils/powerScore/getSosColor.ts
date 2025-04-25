
/**
 * Get appropriate color class for a Strength of Schedule (SOS) score
 * Inverted from Power Score - higher SOS means tougher schedule (red)
 * 
 * @param sos The Strength of Schedule value
 * @returns A CSS class name for text color
 */
export const getSosColor = (sos: number | undefined): string => {
  if (sos === undefined) return 'text-gray-500 dark:text-gray-400';
  
  if (sos >= 0.800) return 'text-red-600 dark:text-red-500';
  if (sos >= 0.560) return 'text-orange-500 dark:text-orange-400';
  return 'text-green-600 dark:text-green-500';
};

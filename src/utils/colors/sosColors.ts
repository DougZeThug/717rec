
/**
 * Get appropriate Tailwind color class for a Strength of Schedule (SOS) value
 * Higher SOS means tougher schedule (red), lower means easier (green)
 */
export const getSosColor = (sos: number | undefined): string => {
  if (sos === undefined) return 'text-gray-500 dark:text-gray-400';
  
  if (sos >= 0.875) return 'text-red-700 dark:text-red-500';
  if (sos >= 0.750) return 'text-red-500 dark:text-red-400';
  if (sos >= 0.550) return 'text-orange-500 dark:text-orange-400';
  return 'text-green-600 dark:text-green-500';
};

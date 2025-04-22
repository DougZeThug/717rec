
/**
 * Get appropriate color class for a Strength of Schedule (SOS) score
 * 
 * @param sos The Strength of Schedule value
 * @returns A CSS class name for text color
 */
export const getSosColor = (sos: number | undefined): string => {
  if (sos === undefined) return '';
  
  if (sos >= 75) return 'text-green-600';
  if (sos >= 60) return 'text-blue-500';
  if (sos >= 40) return 'text-orange-500';
  return 'text-red-500';
};

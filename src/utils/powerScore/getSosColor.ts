
/**
 * Get appropriate color class for a Strength of Schedule (SOS) score
 * 
 * @param sos The Strength of Schedule value
 * @returns A CSS class name for text color
 */
export const getSosColor = (sos: number | undefined): string => {
  if (sos === undefined) return '';
  
  if (sos >= 80) return 'text-green-600';
  if (sos >= 70) return 'text-blue-500';
  if (sos >= 50) return 'text-orange-500';
  return 'text-red-500';
};

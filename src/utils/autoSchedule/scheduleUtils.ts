import { format } from 'date-fns';

import { errorLog } from '@/utils/logger';

/**
 * Format date for display in schedule UI
 */
export const formatScheduleDate = (date: Date | null): string => {
  if (!date) return '';

  try {
    // Use UTC methods to avoid timezone issues
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    // Reconstruct date using fixed timezone
    const normalizedDate = new Date(Date.UTC(year, month, day));

    return format(normalizedDate, 'EEEE, MMMM d, yyyy');
  } catch (error) {
    errorLog('Error formatting schedule date:', error);
    return format(date, 'EEEE, MMMM d, yyyy');
  }
};

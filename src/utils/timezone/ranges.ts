import { timezoneLog } from '@/utils/logger';

import { DateRange } from './types';

/**
 * Create a date range that includes the evening session
 * This ensures that evening matches (which may be stored as next-day UTC)
 * are included when filtering for a specific day
 */
export const createEveningAwareDateRange = (date: Date): DateRange => {
  // Create start date (the selected day at midnight UTC)
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Start at 00:00:00 of the selected day in UTC
  const startDate = new Date(Date.UTC(year, month, day, 0, 0, 0));

  // End at 23:59:59 of the NEXT day in UTC
  // This ensures we catch evening EST matches that fall into the next UTC day
  const endDate = new Date(Date.UTC(year, month, day + 1, 23, 59, 59));

  timezoneLog('Evening-aware date range', {
    selectedDate: date.toDateString(),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    startUTCHours: startDate.getUTCHours(),
    endUTCHours: endDate.getUTCHours(),
  });

  return { startDate, endDate };
};

import { errorLog } from '@/utils/logger';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Format date for display in schedule UI
 */
export const formatScheduleDate = (date: Date | null): string => {
  if (!date) return '';

  try {
    // Read the date entirely in UTC so the formatted output does not depend
    // on the runner's local timezone.
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();

    return `${WEEKDAYS[weekday]}, ${MONTHS[month]} ${day}, ${year}`;
  } catch (error) {
    errorLog('Error formatting schedule date:', error);
    return '';
  }
};

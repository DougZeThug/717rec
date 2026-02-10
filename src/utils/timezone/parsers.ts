import { errorLog } from '@/utils/logger';

/**
 * Parse a time string into hours and minutes
 * Handles both 12-hour and 24-hour formats
 */
export const parseTimeString = (timeString: string): { hours: number; minutes: number } => {
  let hours = 0;
  let minutes = 0;

  if (!timeString) {
    return { hours, minutes };
  }

  try {
    const normalized = timeString.trim().toUpperCase();
    const match = normalized.match(/(\d+):(\d+)\s?(AM|PM)?/);

    if (!match) {
      return { hours, minutes };
    }

    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const period = match[3];

    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return { hours, minutes };
  } catch (error) {
    errorLog('Error parsing time string', error);
    return { hours: 0, minutes: 0 };
  }
};

import { errorLog } from '@/utils/logger';

/**
 * Parse a time string into hours and minutes
 * Handles both 12-hour and 24-hour formats
 */
export const parseTimeString = (timeString: string): { hours: number, minutes: number } => {
  let hours = 0;
  let minutes = 0;
  
  if (!timeString) {
    return { hours, minutes };
  }
  
  try {
    if (timeString.includes('PM') || timeString.includes('AM')) {
      // 12-hour format like "6:30 PM"
      const [time, period] = timeString.split(' ');
      const [hourStr, minuteStr] = time.split(':');
      
      hours = parseInt(hourStr);
      minutes = parseInt(minuteStr);
      
      // Convert to 24-hour format
      if (period === 'PM' && hours < 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
    } else {
      // Already in 24-hour format like "18:30"
      const [hourStr, minuteStr] = timeString.split(':');
      hours = parseInt(hourStr);
      minutes = parseInt(minuteStr);
    }
    
    return { hours, minutes };
  } catch (error) {
    errorLog('Error parsing time string', error);
    return { hours: 0, minutes: 0 };
  }
};

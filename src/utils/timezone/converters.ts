

import { parseTimeString } from './parsers';
import { logTimeOperation } from './logger';

/**
 * Convert a local date to a UTC date
 * For storing in the database
 */
export const toUTCDate = (localDate: Date): Date => {
  return new Date(localDate.toISOString());
};

/**
 * Convert a UTC date to a local date 
 * For displaying in the UI
 */
export const toLocalDate = (utcDate: Date | string): Date => {
  // If string is passed, convert to Date object
  const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(dateObj);
};

/**
 * Create a date object with the correct UTC time for storage
 */
export const createUTCDateWithTime = (date: Date, timeString: string): Date => {
  logTimeOperation('createUTCDateWithTime inputs', {
    date: date.toISOString(),
    timeString,
    localDateString: date.toString()
  });
  
  if (!timeString) {
    logTimeOperation('No time string provided, returning date as is', null);
    return date;
  }

  // Extract hours and minutes from the time string
  const { hours, minutes } = parseTimeString(timeString);
  
  // Create a new local date from the input date
  const localDate = new Date(date);
  
  // Set the hours and minutes in local time
  localDate.setHours(hours, minutes, 0, 0);
  
  logTimeOperation('Local date with time set', {
    localDateWithTime: localDate.toString(),
    localHours: localDate.getHours(),
    localMinutes: localDate.getMinutes()
  });
  
  // Convert to UTC by creating a new Date from ISO string
  // This automatically handles the timezone offset conversion
  const utcDate = new Date(localDate.toISOString());

  logTimeOperation('createUTCDateWithTime detailed debugging', {
    original: {
      timeString,
      dateString: date.toString()
    },
    parsedTime: {
      hours, 
      minutes
    },
    localDate: {
      dateString: localDate.toString(),
      hours: localDate.getHours(),
      minutes: localDate.getMinutes(),
      timezoneOffset: localDate.getTimezoneOffset() / 60
    },
    result: {
      utcIsoString: utcDate.toISOString(),
      utcDateString: utcDate.toString(),
      utcHours: utcDate.getUTCHours(),
      utcMinutes: utcDate.getUTCMinutes()
    }
  });
  
  return utcDate;
};

/**
 * Format a time string to UTC format
 * Used for ensuring consistent storage of times in the database
 */
export const formatTimeToUTC = (date: Date, timeString: string): string => {
  try {
    if (!timeString || !date) {
      return '';
    }
    
    logTimeOperation('formatTimeToUTC input', {
      date: date.toString(),
      timeString
    });
    
    // Create UTC date with the time string
    const utcDate = createUTCDateWithTime(date, timeString);
    
    // Format to ISO string
    const isoString = utcDate.toISOString();
    
    logTimeOperation('formatTimeToUTC result', {
      input: timeString,
      output: isoString
    });
    
    return isoString;
  } catch (error) {
    console.error('Error formatting time to UTC:', error);
    return '';
  }
};

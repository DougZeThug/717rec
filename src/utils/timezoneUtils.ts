
/**
 * Timezone utilities for consistent time handling between local time and UTC
 * 
 * This module provides functions to convert between local browser time and UTC
 * for proper display and storage of time values.
 */

// ============================================================
// Types
// ============================================================

/**
 * Options for displaying a time
 */
interface TimeDisplayOptions {
  use24Hour?: boolean;
  includeSeconds?: boolean;
}

/**
 * Date range for querying
 */
interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ============================================================
// Time Parsing and Formatting Utilities
// ============================================================

/**
 * Parse a time string into hours and minutes
 * Handles both 12-hour and 24-hour formats
 */
const parseTimeString = (timeString: string): { hours: number, minutes: number } => {
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
    console.error('🚨 Error parsing time string:', error);
    return { hours: 0, minutes: 0 };
  }
};

/**
 * Format a local time string (e.g., "6:30 PM") to 24-hour format 
 * and convert to UTC time string for consistent storage
 */
export const formatTimeToUTC = (timeString: string): string => {
  console.log(`🌐 formatTimeToUTC input:`, timeString);
  
  // Parse the time string and convert to 24-hour format
  const { hours, minutes } = parseTimeString(timeString);
  
  // Format as "HH:MM" in 24-hour format
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  console.log(`🌐 formatTimeToUTC output:`, formattedTime);
  return formattedTime;
};

// ============================================================
// Date Conversion Utilities
// ============================================================

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
  console.log(`🌐 createUTCDateWithTime inputs:`, {
    date: date.toISOString(),
    timeString,
    localDateString: date.toString()
  });
  
  if (!timeString) {
    console.warn("No time string provided, returning date as is");
    return date;
  }

  // Extract hours and minutes from the time string
  const { hours, minutes } = parseTimeString(timeString);
  
  // Create a new local date from the input date
  const localDate = new Date(date);
  
  // Set the hours and minutes in local time
  localDate.setHours(hours, minutes, 0, 0);
  
  console.log(`🌐 Local date with time set:`, {
    localDateWithTime: localDate.toString(),
    localHours: localDate.getHours(),
    localMinutes: localDate.getMinutes()
  });
  
  // Convert to UTC by creating a new Date from ISO string
  // This automatically handles the timezone offset conversion
  const utcDate = new Date(localDate.toISOString());

  console.log(`🌐 createUTCDateWithTime detailed debugging:`, {
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

// ============================================================
// Display Formatting Utilities
// ============================================================

/**
 * Format a UTC date object to display in local time
 */
export const formatUTCToLocalTimeString = (date: Date | string, options?: TimeDisplayOptions): string => {
  if (!date) return 'No Time';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return dateObj.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: options?.use24Hour === false || true
    });
  } catch (error) {
    console.error('🚨 Error formatting UTC to local time:', error);
    return 'No Time';
  }
};

/**
 * Extract a standardized time slot string from a UTC date
 * For grouping and display purposes
 */
export const extractTimeSlotFromUTC = (dateString: string): string => {
  try {
    console.log(`🌐 extractTimeSlotFromUTC input:`, {
      dateString,
      type: typeof dateString
    });
    
    if (!dateString) {
      console.warn('Empty date string passed to extractTimeSlotFromUTC');
      return 'No Time';
    }
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date string in extractTimeSlotFromUTC: "${dateString}"`);
      return 'No Time';
    }
    
    // Convert UTC to local time (browser's timezone) and format
    const timeSlot = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    console.log(`🌐 extractTimeSlotFromUTC output:`, {
      input: dateString,
      parsed: date.toString(),
      utcHours: date.getUTCHours(),
      utcMinutes: date.getUTCMinutes(),
      localHours: date.getHours(),
      localMinutes: date.getMinutes(),
      timeSlot
    });
    
    return timeSlot;
  } catch (error) {
    console.error('🚨 Error extracting time slot:', error);
    return 'No Time';
  }
};

// ============================================================
// Query and Range Utilities
// ============================================================

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
  
  console.log(`📅 Evening-aware date range:`, {
    selectedDate: date.toDateString(),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    startUTCHours: startDate.getUTCHours(),
    endUTCHours: endDate.getUTCHours()
  });
  
  return { startDate, endDate };
};

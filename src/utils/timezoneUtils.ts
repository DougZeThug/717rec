
/**
 * Timezone utilities for consistent time handling between EST frontend and UTC storage
 * 
 * This module provides functions to convert between local time (EST) and UTC
 * for proper display and storage of time values.
 */

/**
 * Convert a local date (EST/EDT) to a UTC date
 * For storing in the database
 */
export const toUTCDate = (localDate: Date): Date => {
  return new Date(localDate.toISOString());
};

/**
 * Convert a UTC date to a local date (EST/EDT)
 * For displaying in the UI
 */
export const toLocalDate = (utcDate: Date | string): Date => {
  // If string is passed, convert to Date object
  const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(dateObj);
};

/**
 * Format a local time string (e.g., "6:30 PM") to 24-hour format 
 * and convert to UTC time string for consistent storage
 */
export const formatTimeToUTC = (timeString: string): string => {
  console.log(`🌐 formatTimeToUTC input:`, timeString);
  
  // Parse the time string and convert to 24-hour format
  let hours = 0;
  let minutes = 0;
  
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
  
  // Format as "HH:MM" in 24-hour format
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  console.log(`🌐 formatTimeToUTC output:`, formattedTime);
  return formattedTime;
};

/**
 * Create a date object with the correct UTC time for storage
 */
export const createUTCDateWithTime = (date: Date, timeString: string): Date => {
  console.log(`🌐 createUTCDateWithTime inputs:`, {
    date: date.toISOString(),
    timeString
  });
  
  // Create a new date object to avoid modifying the original
  const result = new Date(date);
  
  // Parse the time string
  let hours = 0;
  let minutes = 0;
  
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
  
  // Set time components in local time
  result.setHours(hours, minutes, 0, 0);
  
  console.log(`🌐 Local date-time set:`, {
    date: result.toString(),
    hours,
    minutes
  });
  
  // Convert to UTC ISO string and create a new Date to ensure UTC storage
  const utcDate = new Date(result.toISOString());
  
  console.log(`🌐 createUTCDateWithTime output:`, {
    original: result.toString(),
    utc: utcDate.toISOString(),
    utcHours: utcDate.getUTCHours(),
    utcMinutes: utcDate.getUTCMinutes()
  });
  
  return utcDate;
};

/**
 * Format a UTC date object to display in EST time
 */
export const formatUTCToLocalTimeString = (date: Date | string): string => {
  if (!date) return 'No Time';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true
  });
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

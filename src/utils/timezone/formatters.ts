
/**
 * Format utility functions for timezone display
 */

import { TimeDisplayOptions } from './types';
import { logTimeOperation } from './logger';

/**
 * Format a UTC date to a local time string
 * This is used for displaying stored UTC times in local timezone
 */
export const formatUTCToLocalTimeString = (
  date: Date, 
  options: TimeDisplayOptions = { use24Hour: false, includeSeconds: false }
): string => {
  // Convert UTC date to local timezone for display
  try {
    const { use24Hour, includeSeconds } = options;
    
    // Time formatting options
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: !use24Hour
    };
    
    // Create formatter for the user's locale
    const formatter = new Intl.DateTimeFormat(undefined, timeOptions);
    const formattedTime = formatter.format(date);
    
    logTimeOperation('Formatted UTC date to local time', {
      utcInput: date.toISOString(),
      localOutput: formattedTime,
      userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    return formattedTime;
  } catch (error) {
    console.error('Error formatting UTC date to local time:', error);
    return '';
  }
};

/**
 * Format time string components (hours/minutes) to a standardized time string
 */
export const formatTimeString = (hours: number, minutes: number, use24Hour: boolean = false): string => {
  if (use24Hour) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Ensure all time strings are in the same format (for database consistency)
 * This normalizes time display formats to match what's stored in the database
 */
export const normalizeTimeString = (timeString: string): string => {
  // List of allowed time formats in the database
  const allowedTimes = ['6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM'];
  
  if (!timeString) {
    return '';
  }
  
  // Check if already in correct format
  if (allowedTimes.includes(timeString)) {
    return timeString;
  }
  
  // Try to normalize
  try {
    // Extract hours & minutes, handling various formats
    let hours = 0;
    let minutes = 0;
    let period = 'AM';
    
    if (timeString.includes(':')) {
      const parts = timeString.split(':');
      
      if (parts.length >= 2) {
        // Parse hours
        hours = parseInt(parts[0], 10);
        
        // Parse minutes (handle cases like "7:30 PM" where parts[1] would be "30 PM")
        if (parts[1].includes('PM') || parts[1].includes('AM')) {
          const minuteParts = parts[1].trim().split(' ');
          minutes = parseInt(minuteParts[0], 10);
          period = minuteParts[1] || period;
        } else {
          minutes = parseInt(parts[1], 10);
        }
        
        // Check if PM is specified anywhere in the string
        if (timeString.toUpperCase().includes('PM')) {
          period = 'PM';
          if (hours < 12) hours += 12;
        }
      }
    } else {
      // Handle formats without a colon
      hours = parseInt(timeString, 10);
    }
    
    // Format to 12-hour time
    const hour12 = (hours > 12) ? hours - 12 : (hours === 0 ? 12 : hours);
    const formattedTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
    
    // Check if the formatted time is in the allowed list
    if (allowedTimes.includes(formattedTime)) {
      return formattedTime;
    }
    
    return timeString; // Return original if normalization failed
  } catch (error) {
    console.error('Error normalizing time string:', error);
    return timeString; // Return original on error
  }
};

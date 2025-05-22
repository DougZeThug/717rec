
import { parseTimeString } from './parsers';
import { TimeDisplayOptions } from './types';
import { logTimeOperation, logTimeWarning, logTimeError } from './logger';

/**
 * Format a local time string (e.g., "6:30 PM") to 24-hour format 
 * and convert to UTC time string for consistent storage
 */
export const formatTimeToUTC = (timeString: string): string => {
  logTimeOperation('formatTimeToUTC input', timeString);
  
  // Parse the time string and convert to 24-hour format
  const { hours, minutes } = parseTimeString(timeString);
  
  // Format as "HH:MM" in 24-hour format
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  logTimeOperation('formatTimeToUTC output', formattedTime);
  return formattedTime;
};

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
    logTimeError('Error formatting UTC to local time', error);
    return 'No Time';
  }
};

/**
 * Extract a standardized time slot string from a UTC date
 * For grouping and display purposes
 */
export const extractTimeSlotFromUTC = (dateString: string): string => {
  try {
    logTimeOperation('extractTimeSlotFromUTC input', {
      dateString,
      type: typeof dateString
    });
    
    if (!dateString) {
      logTimeWarning('Empty date string passed to extractTimeSlotFromUTC');
      return 'No Time';
    }
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      logTimeWarning(`Invalid date string in extractTimeSlotFromUTC: "${dateString}"`);
      return 'No Time';
    }
    
    // Convert UTC to local time (browser's timezone) and format
    const timeSlot = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    logTimeOperation('extractTimeSlotFromUTC output', {
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
    logTimeError('Error extracting time slot', error);
    return 'No Time';
  }
};

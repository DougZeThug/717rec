/**
 * Format utility functions for timezone display
 */

import { errorLog, timezoneLog } from '@/utils/logger';

import { TimeDisplayOptions } from './types';

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
      hour12: !use24Hour,
    };

    // Create formatter for the user's locale
    const formatter = new Intl.DateTimeFormat(undefined, timeOptions);
    const formattedTime = formatter.format(date);

    timezoneLog('Formatted UTC date to local time', {
      utcInput: date.toISOString(),
      localOutput: formattedTime,
      userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    return formattedTime;
  } catch (error) {
    errorLog('Error formatting UTC date to local time:', error);
    return '';
  }
};

/**
 * Extract a standardized time slot from a UTC date
 * Useful for grouping matches by time slot
 */
export const extractTimeSlotFromUTC = (date: Date | string): string => {
  try {
    // Convert to Date object if string is passed
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Convert UTC to local time for display
    const formattedTime = formatUTCToLocalTimeString(dateObj);

    timezoneLog('Extracted time slot from UTC date', {
      input: typeof date === 'string' ? date : date.toISOString(),
      output: formattedTime,
    });

    // UPDATED: Standard time slots now include 5:00 PM
    const timeSlots = [
      '5:00 PM',
      '5:30 PM',
      '6:00 PM',
      '6:30 PM',
      '7:00 PM',
      '7:30 PM',
      '8:00 PM',
      '8:30 PM',
      '9:00 PM',
      '9:30 PM',
      '10:00 PM',
    ];

    // Find exact match first
    if (timeSlots.includes(formattedTime)) {
      return formattedTime;
    }

    // If no exact match, try to find the closest time slot
    // This helps with slight time variations due to timezone conversion
    const timeParts = formattedTime.match(/(\d+):(\d+)\s?(AM|PM)/i);
    if (!timeParts) return 'No Time';

    let hours = parseInt(timeParts[1], 10);
    const minutes = parseInt(timeParts[2], 10);
    const period = timeParts[3].toUpperCase();

    // Convert to 24-hour format for easier comparison
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    // FIXED: Calculate minutes from 6:00 PM baseline instead of 6:30 PM
    const minutesFromBaseline = (hours - 18) * 60 + minutes;

    // UPDATED: Map to standard time slots at 30-minute intervals starting from 6:00 PM
    if (minutesFromBaseline < 15)
      return '6:00 PM'; // 6:00-6:14 PM
    else if (minutesFromBaseline < 45)
      return '6:30 PM'; // 6:15-6:44 PM
    else if (minutesFromBaseline < 75)
      return '7:00 PM'; // 6:45-7:14 PM
    else if (minutesFromBaseline < 105)
      return '7:30 PM'; // 7:15-7:44 PM
    else if (minutesFromBaseline < 135)
      return '8:00 PM'; // 7:45-8:14 PM
    else if (minutesFromBaseline < 165)
      return '8:30 PM'; // 8:15-8:44 PM
    else if (minutesFromBaseline < 195)
      return '9:00 PM'; // 8:45-9:14 PM
    else if (minutesFromBaseline < 225)
      return '9:30 PM'; // 9:15-9:44 PM
    else return '10:00 PM'; // 9:45 PM and later
  } catch (error) {
    errorLog('Error extracting time slot from UTC date:', error);
    return 'No Time';
  }
};

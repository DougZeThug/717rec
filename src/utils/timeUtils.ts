import { Match } from '@/types';
import { errorLog, timezoneLog } from '@/utils/logger';

import { extractTimeSlotFromUTC } from './timezone';

/**
 * Groups an array of matches by time slot.
 *
 * @param matches An array of Match objects to group.
 * @returns An object where the keys are time slots and the values are arrays of Match objects.
 */
export const groupMatchesByTimeSlot = (matches: Match[]): { [timeSlot: string]: Match[] } => {
  return matches.reduce((acc: { [timeSlot: string]: Match[] }, match: Match) => {
    // Use our utility to extract time slot from UTC date
    const timeSlot = match.date ? extractTimeSlotFromUTC(match.date) : 'No Time';

    if (!acc[timeSlot]) {
      acc[timeSlot] = [];
    }

    acc[timeSlot].push(match);
    return acc;
  }, {});
};

/**
 * Normalize time format to standardized 12-hour format (e.g., "7:00 PM")
 */
export const normalizeTimeFormat = (timeString: string): string => {
  if (!timeString) return '';

  // Remove any extra spaces
  const cleanedTime = timeString.trim();

  // Check if time already has AM/PM indicator
  if (cleanedTime.toLowerCase().includes('am') || cleanedTime.toLowerCase().includes('pm')) {
    // Ensure consistent formatting (e.g., "7:00 PM" instead of "7:00PM")
    const [timePart, meridiem] = cleanedTime.split(/(?=[AP]M)/i);
    return `${timePart.trim()} ${meridiem.toUpperCase()}`;
  }

  // Assume 24-hour format and convert to 12-hour
  try {
    const [hours, minutes] = cleanedTime.split(':').map(Number);
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${meridiem}`;
  } catch (error) {
    errorLog('Error normalizing time format:', error);
    return timeString;
  }
};

/**
 * Group match times into standard time blocks
 */
export const getTimeBlock = (time: string): string | null => {
  const normalizedTime = normalizeTimeFormat(time);

  if (normalizedTime.includes('6:30') || normalizedTime.includes('7:00')) {
    return '6:30';
  } else if (normalizedTime.includes('7:30') || normalizedTime.includes('8:00')) {
    return '7:30';
  } else if (normalizedTime.includes('8:30') || normalizedTime.includes('9:00')) {
    return '8:30';
  }

  return null;
};

/**
 * Get corresponding time pair for a time block
 */
export const getTimePairForBlock = (block: string): [string, string] | null => {
  switch (block) {
    case '6:30':
      return ['6:30 PM', '7:00 PM'];
    case '7:30':
      return ['7:30 PM', '8:00 PM'];
    case '8:30':
      return ['8:30 PM', '9:00 PM'];
    default:
      return null;
  }
};

/**
 * Extract time slot from a date string
 * Used specifically for grouping matches by time in the admin panel
 */
export const extractTimeSlot = (dateString: string): string => {
  return extractTimeSlotFromUTC(dateString);
};

/**
 * Test the time conversion between local (EST/EDT) and UTC
 * Useful for debugging timezone issues
 */
export const testTimeConversion = (timeString: string): void => {
  timezoneLog(`Testing time conversion for "${timeString}":`, {
    original: timeString,
    normalized: normalizeTimeFormat(timeString),
  });

  // Create a test date with the time
  const testDate = new Date();
  const utcDate = new Date(testDate);

  // Parse hours and minutes
  let hours = 0;
  let minutes = 0;

  if (timeString.includes('PM') || timeString.includes('AM')) {
    const [time, period] = timeString.split(' ');
    const [hourStr, minuteStr] = time.split(':');

    hours = parseInt(hourStr);
    minutes = parseInt(minuteStr);

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  }

  // Set the local time
  testDate.setHours(hours, minutes, 0, 0);

  // Set the UTC time directly
  utcDate.setUTCHours(hours, minutes, 0, 0);

  timezoneLog(`Conversion results:`, {
    localTimeString: testDate.toLocaleTimeString(),
    localISOString: testDate.toISOString(),
    directUTCISOString: utcDate.toISOString(),
    localHours: testDate.getHours(),
    localMinutes: testDate.getMinutes(),
    utcHours: testDate.getUTCHours(),
    utcMinutes: testDate.getUTCMinutes(),
    directUTCHours: utcDate.getUTCHours(),
    directUTCMinutes: utcDate.getUTCMinutes(),
  });
};

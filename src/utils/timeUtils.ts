
import { Match } from "@/types";

/**
 * Groups an array of matches by time slot.
 *
 * @param matches An array of Match objects to group.
 * @returns An object where the keys are time slots and the values are arrays of Match objects.
 */
export const groupMatchesByTimeSlot = (matches: Match[]): { [timeSlot: string]: Match[] } => {
  return matches.reduce((acc: { [timeSlot: string]: Match[] }, match: Match) => {
    // Use a default value if match.date is undefined
    const timeSlot = new Date(match.date || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
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
    console.error('Error normalizing time format:', error);
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
    case '6:30': return ['6:30 PM', '7:00 PM'];
    case '7:30': return ['7:30 PM', '8:00 PM'];
    case '8:30': return ['8:30 PM', '9:00 PM'];
    default: return null;
  }
};

/**
 * Extract time slot from a date string
 * Used specifically for grouping matches by time in the admin panel
 */
export const extractTimeSlot = (dateString: string): string => {
  try {
    console.log(`🕰️ extractTimeSlot input:`, {
      dateString,
      type: typeof dateString
    });
    
    if (!dateString) {
      console.warn('Empty date string passed to extractTimeSlot');
      return 'No Time';
    }
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date string in extractTimeSlot: "${dateString}"`);
      return 'No Time';
    }
    
    const timeSlot = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    console.log(`🕰️ extractTimeSlot output:`, {
      input: dateString,
      parsed: date.toString(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
      timeSlot
    });
    
    return timeSlot;
  } catch (error) {
    console.error('Error extracting time slot:', error);
    return 'No Time';
  }
};

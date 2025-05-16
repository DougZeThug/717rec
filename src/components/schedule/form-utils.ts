
import { createUTCDateWithTime, formatUTCToLocalTimeString } from '@/utils/timezoneUtils';

/**
 * Format a date object for use in an HTML date input
 */
export const formatDateForInput = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Create a date with the selected time slot, properly converted to UTC for storage
 */
export const createDateWithTime = (date: Date, timeSlot: string | null): Date => {
  if (!timeSlot) {
    console.log("🌐 No time slot provided, returning date with default time");
    return date;
  }
  
  console.log("🌐 Creating date with time:", {
    date: date.toString(),
    timeSlot,
    action: "Converting to UTC for storage"
  });
  
  // Use our fixed utility to handle time conversion properly
  const utcDate = createUTCDateWithTime(date, timeSlot);
  
  // Add extra validation logging
  console.log("🌐 Time conversion complete:", {
    originalTimeSlot: timeSlot,
    resultTime: utcDate.toISOString(),
    utcHours: utcDate.getUTCHours(),
    utcMinutes: utcDate.getUTCMinutes()
  });
  
  return utcDate;
};

/**
 * Get time slot from a date object, converting from UTC to local time
 */
export const getTimeSlotFromDate = (date: Date): string | null => {
  return formatUTCToLocalTimeString(date);
};

/**
 * Calculate winner and loser IDs based on team scores
 */
export const determineMatchOutcome = (
  isCompleted: boolean,
  team1Id: string,
  team2Id: string,
  team1Score: number | undefined,
  team2Score: number | undefined
): { winnerId?: string, loserId?: string } => {
  if (!isCompleted || team1Score === undefined || team2Score === undefined) {
    return {};
  }
  
  if (team1Score > team2Score) {
    return { winnerId: team1Id, loserId: team2Id };
  } else if (team2Score > team1Score) {
    return { winnerId: team2Id, loserId: team1Id };
  }
  
  return {};
};

/**
 * Determine if a match time is in the evening
 * This helps with UI display to indicate which matches may appear on different UTC days
 */
export const isEveningMatch = (date: Date): boolean => {
  if (!date) return false;
  
  const hours = date.getHours();
  // Consider matches after 6pm to be "evening" matches
  return hours >= 18; 
};

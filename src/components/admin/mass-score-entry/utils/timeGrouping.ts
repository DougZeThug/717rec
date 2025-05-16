
import { MatchWithTeams } from "../types";
import { extractTimeSlot } from "@/utils/timeUtils";

/**
 * Groups matches by their time slot for the mass score entry page
 * Enhanced to properly handle all time slots including evening times
 */
export const groupMatchesByTimeSlot = (matches: MatchWithTeams[]): Record<string, MatchWithTeams[]> => {
  return matches.reduce((acc, match) => {
    if (!match.date) {
      // For matches without dates, group them under "No Time"
      const key = "No Time";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(match);
      return acc;
    }
    
    // Log date before extraction to help with debugging
    console.log(`⏰ groupMatchesByTimeSlot processing match ${match.id}:`, {
      matchDate: match.date,
      matchDateType: typeof match.date,
      matchDateObject: new Date(match.date).toString()
    });
    
    const timeSlot = extractTimeSlot(match.date);
    
    console.log(`⏰ Match ${match.id} assigned to time slot: "${timeSlot}"`);
    
    if (!acc[timeSlot]) {
      acc[timeSlot] = [];
    }
    
    acc[timeSlot].push(match);
    return acc;
  }, {} as Record<string, MatchWithTeams[]>);
};

/**
 * Sorts time slots in chronological order
 * Enhanced to properly handle all time formats including evening times
 */
export const sortTimeSlots = (timeSlots: string[]): string[] => {
  return timeSlots.sort((a, b) => {
    if (a === "No Time") return 1;
    if (b === "No Time") return -1;
    
    // Enhanced parsing to handle different time formats
    const parseTime = (timeStr: string): number => {
      try {
        // First try to handle 12-hour format (8:00 PM, etc.)
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
          // Split time string into components
          const [timeComponent, period] = timeStr.split(/\s+/);
          let [hours, minutes] = timeComponent.split(':').map(Number);
          
          // Convert to 24-hour format for proper sorting
          if (period.toUpperCase() === 'PM' && hours < 12) {
            hours += 12;
          } else if (period.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
          }
          
          return hours * 60 + (minutes || 0);
        }
        
        // Try to parse as 24-hour format (13:00, etc.)
        const [hours24, minutes24] = timeStr.split(':').map(Number);
        if (!isNaN(hours24)) {
          return hours24 * 60 + (minutes24 || 0);
        }
        
        // If we couldn't parse it directly, try as a full date string
        const date = new Date(`1970-01-01T${timeStr}`);
        if (!isNaN(date.getTime())) {
          return date.getHours() * 60 + date.getMinutes();
        }
        
        console.warn(`Failed to parse time: ${timeStr}`);
        return 0;
      } catch (e) {
        console.error(`Error parsing time "${timeStr}":`, e);
        return 0;
      }
    };
    
    const timeValueA = parseTime(a);
    const timeValueB = parseTime(b);
    
    console.log(`Comparing times: "${a}" (${timeValueA}) vs "${b}" (${timeValueB})`);
    
    return timeValueA - timeValueB;
  });
};

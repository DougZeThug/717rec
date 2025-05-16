
import { MatchWithTeams } from "../types";
import { extractTimeSlotFromUTC } from "@/utils/timezoneUtils";

/**
 * Groups matches by their time slot for the mass score entry page
 */
export const groupMatchesByTimeSlot = (matches: MatchWithTeams[]): Record<string, MatchWithTeams[]> => {
  console.log(`⏰ Grouping ${matches.length} matches by time slot`);
  
  return matches.reduce((acc, match, index) => {
    if (!match.date) {
      // For matches without dates, group them under "No Time"
      const key = "No Time";
      console.log(`⏰ Match ${match.id} (index ${index}) has no date, assigned to "${key}"`);
      
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        ...match,
        id: `${match.id}-index-${index}` // Append index for reference
      });
      return acc;
    }
    
    // Log date before extraction to help with debugging
    console.log(`⏰ groupMatchesByTimeSlot processing match ${match.id} (index ${index}):`, {
      matchDate: match.date,
      matchDateType: typeof match.date
    });
    
    // Use our updated timezone-aware utility
    const timeSlot = extractTimeSlotFromUTC(match.date);
    
    console.log(`⏰ Match ${match.id} (index ${index}) assigned to time slot: "${timeSlot}"`);
    
    if (!acc[timeSlot]) {
      acc[timeSlot] = [];
    }
    
    // Add the match with index reference embedded in the ID
    acc[timeSlot].push({
      ...match,
      id: `${match.id}-index-${index}`
    });
    
    return acc;
  }, {} as Record<string, MatchWithTeams[]>);
};

/**
 * Sorts time slots in chronological order
 */
export const sortTimeSlots = (timeSlots: string[]): string[] => {
  return timeSlots.sort((a, b) => {
    if (a === "No Time") return 1;
    if (b === "No Time") return -1;
    
    // Enhanced parsing to handle different time formats
    const parseTime = (timeStr: string): number => {
      try {
        // Try to parse as 12-hour format
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
          const [time, period] = timeStr.split(/\s+/);
          const [hours, minutes] = time.split(':').map(Number);
          
          let hours24 = hours;
          if (period === 'PM' && hours < 12) hours24 += 12;
          if (period === 'AM' && hours === 12) hours24 = 0;
          
          return hours24 * 60 + minutes;
        }
        
        // Try standard time parsing
        const timeA = new Date(`1970/01/01 ${timeStr}`).getTime();
        if (!isNaN(timeA)) return timeA;
        
        // Last resort, just compare strings
        return 0;
      } catch (e) {
        console.error(`Error parsing time "${timeStr}":`, e);
        return 0;
      }
    };
    
    return parseTime(a) - parseTime(b);
  });
};

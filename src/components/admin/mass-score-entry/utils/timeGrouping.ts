
import { MatchWithTeams } from "../types";
import { extractTimeSlot } from "@/utils/timeUtils";

/**
 * Groups matches by their time slot for the mass score entry page
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
    
    const timeSlot = extractTimeSlot(match.date);
    
    if (!acc[timeSlot]) {
      acc[timeSlot] = [];
    }
    
    acc[timeSlot].push(match);
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
    
    const timeA = new Date(`1970/01/01 ${a}`).getTime();
    const timeB = new Date(`1970/01/01 ${b}`).getTime();
    return timeA - timeB;
  });
};

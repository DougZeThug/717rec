
import { Match } from "@/types";

export const createDateWithTime = (date: Date, timeSlot: string | null): Date => {
  if (!timeSlot) return date;
  
  const newDate = new Date(date);
  const [hourStr, minuteStr] = timeSlot.split(':');
  const hour = parseInt(hourStr, 10);
  
  // Handle "PM" or "AM" suffix if present
  let adjustedHour = hour;
  if (timeSlot.includes('PM') && hour < 12) {
    adjustedHour = hour + 12;
  } else if (timeSlot.includes('AM') && hour === 12) {
    adjustedHour = 0;
  }
  
  // Get minutes, handling potential "PM" suffix
  let minutes = 0;
  if (minuteStr) {
    const minutePart = minuteStr.split(' ')[0];
    minutes = parseInt(minutePart, 10);
  }
  
  newDate.setHours(adjustedHour, minutes, 0, 0);
  return newDate;
};

export const getTimeSlotFromDate = (date: Date): string | null => {
  if (!date) return null;
  
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // Format as 12-hour time with AM/PM
  let hour = hours % 12;
  if (hour === 0) hour = 12;
  const amPm = hours < 12 ? 'AM' : 'PM';
  
  return `${hour}:${minutes.toString().padStart(2, '0')} ${amPm}`;
};

export const determineMatchOutcome = (
  isCompleted: boolean,
  team1Id: string,
  team2Id: string,
  team1Score?: number,
  team2Score?: number
): { winner_id: string | undefined; loser_id: string | undefined } => {
  if (!isCompleted || team1Score === undefined || team2Score === undefined) {
    return { winner_id: undefined, loser_id: undefined };
  }
  
  if (team1Score > team2Score) {
    return { winner_id: team1Id, loser_id: team2Id };
  } else if (team2Score > team1Score) {
    return { winner_id: team2Id, loser_id: team1Id };
  }
  
  return { winner_id: undefined, loser_id: undefined };
};

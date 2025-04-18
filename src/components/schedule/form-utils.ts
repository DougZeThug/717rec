
/**
 * Format a date object for use in an HTML date input
 */
export const formatDateForInput = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Create a date with the selected time slot
 */
export const createDateWithTime = (date: Date, timeSlot: string | null): Date => {
  const dateWithTime = new Date(date);
  
  if (timeSlot === "6:30 PM") {
    dateWithTime.setHours(18, 30, 0, 0);
  } else if (timeSlot === "7:00 PM") {
    dateWithTime.setHours(19, 0, 0, 0);
  } else if (timeSlot === "7:30 PM") {
    dateWithTime.setHours(19, 30, 0, 0);
  } else if (timeSlot === "8:00 PM") {
    dateWithTime.setHours(20, 0, 0, 0);
  } else if (timeSlot === "8:30 PM") {
    dateWithTime.setHours(20, 30, 0, 0);
  } else if (timeSlot === "9:00 PM") {
    dateWithTime.setHours(21, 0, 0, 0);
  }
  
  return dateWithTime;
};

/**
 * Get time slot from a date object
 */
export const getTimeSlotFromDate = (date: Date): string | null => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  if (hours === 18 && minutes === 30) {
    return "6:30 PM";
  } else if (hours === 19 && minutes === 0) {
    return "7:00 PM";
  } else if (hours === 19 && minutes === 30) {
    return "7:30 PM";
  } else if (hours === 20 && minutes === 0) {
    return "8:00 PM";
  } else if (hours === 20 && minutes === 30) {
    return "8:30 PM";
  } else if (hours === 21 && minutes === 0) {
    return "9:00 PM";
  }
  
  return null;
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

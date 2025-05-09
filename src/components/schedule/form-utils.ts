
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
  
  if (!timeSlot) {
    return dateWithTime;
  }
  
  // Handle both formats: "6:30 PM" and "18:30"
  if (timeSlot.includes(':')) {
    // Extract hours and minutes regardless of format
    let hours = 0;
    let minutes = 0;
    
    if (timeSlot.includes('PM') || timeSlot.includes('AM')) {
      // 12-hour format like "6:30 PM"
      const [time, period] = timeSlot.split(' ');
      const [hourStr, minuteStr] = time.split(':');
      
      hours = parseInt(hourStr);
      minutes = parseInt(minuteStr);
      
      // Convert to 24-hour format
      if (period === 'PM' && hours < 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
    } else {
      // 24-hour format like "18:30"
      const [hourStr, minuteStr] = timeSlot.split(':');
      hours = parseInt(hourStr);
      minutes = parseInt(minuteStr);
    }
    
    dateWithTime.setHours(hours, minutes, 0, 0);
  } else {
    console.warn("Invalid time slot format:", timeSlot);
  }
  
  return dateWithTime;
};

/**
 * Get time slot from a date object
 */
export const getTimeSlotFromDate = (date: Date): string | null => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // Format as "H:MM AM/PM"
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true
  });
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


/**
 * Extracts the formatted time string from a date string
 */
export const extractTimeSlot = (dateString: string | undefined): string => {
  if (!dateString) return "No Time";
  
  const date = new Date(dateString);
  
  // Format hours and minutes to get time slots like "6:30 PM"
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Groups matches by their time slot
 */
export const groupMatchesByTimeSlot = (matches: any[]): Record<string, any[]> => {
  return matches.reduce((acc, match) => {
    const timeSlot = extractTimeSlot(match.date);
    
    if (!acc[timeSlot]) {
      acc[timeSlot] = [];
    }
    
    acc[timeSlot].push(match);
    return acc;
  }, {} as Record<string, any[]>);
};

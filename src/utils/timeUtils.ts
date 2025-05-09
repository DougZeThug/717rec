
/**
 * Extracts the formatted time string from a date string
 */
export const extractTimeSlot = (dateString: string | undefined): string => {
  if (!dateString) return "No Time";
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn("Invalid date string provided to extractTimeSlot:", dateString);
    return "No Time";
  }
  
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

/**
 * Converts a time string (either "6:30 PM" or "18:30") to 24-hour format
 */
export const normalizeTimeFormat = (timeString: string): string => {
  // If already in 24-hour format like "18:30", return as is
  if (/^\d{1,2}:\d{2}$/.test(timeString)) {
    return timeString;
  }
  
  // Convert 12-hour format like "6:30 PM" to 24-hour format
  const [time, period] = timeString.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Ensures consistent time slot format across the application
 */
export const formatTimeSlot = (timeString: string): string => {
  // Convert to 24-hour first
  const normalized = normalizeTimeFormat(timeString);
  
  // Convert to Date object to use toLocaleTimeString
  const [hours, minutes] = normalized.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  
  // Return in standard 12-hour format
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

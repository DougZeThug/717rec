
import { TimeBlockData } from "@/types/autoSchedule";

// Updated time block keys to match exactly what's stored in the database
export const TIME_BLOCKS: Record<string, TimeBlockData> = {
  // Keys match the main timeslot values in the database ('6:30 PM', not '6:30')
  '6:30 PM': { main: '6:30 PM', secondary: '7:00 PM' },
  '7:30 PM': { main: '7:30 PM', secondary: '8:00 PM' },
  '8:30 PM': { main: '8:30 PM', secondary: '9:00 PM' }
};

// Helper function to find a time block by its key or value
export const findTimeBlockByValue = (value: string): string | null => {
  // Try direct match with keys first
  if (TIME_BLOCKS[value]) {
    return value;
  }
  
  // Try matching with main or secondary values
  for (const [blockKey, blockData] of Object.entries(TIME_BLOCKS)) {
    if (blockData.main === value || blockData.secondary === value) {
      return blockKey;
    }
  }
  
  // Try matching without the "PM" part if it's missing
  if (!value.includes('PM')) {
    const withPM = `${value} PM`;
    if (TIME_BLOCKS[withPM]) {
      return withPM;
    }
    
    for (const [blockKey, blockData] of Object.entries(TIME_BLOCKS)) {
      if (blockData.main === withPM || blockData.secondary === withPM) {
        return blockKey;
      }
    }
  }
  
  return null;
};

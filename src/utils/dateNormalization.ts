
/**
 * Normalizes a date value to an ISO string with validation and tracing
 * Simplified to ensure consistent date handling across the application
 */
export const normalizeDate = (date: Date | string | null, context: string = 'unknown'): string => {
  // Start with current date as fallback
  const fallbackDate = new Date().toISOString().split('T')[0];
  
  // Log the incoming value for detailed tracing
  console.log(`🕒 [${context}] normalizeDate input:`, {
    value: date,
    type: typeof date,
    isDate: typeof date === 'object' && date instanceof Date,
    isString: typeof date === 'string',
    isNull: date === null
  });
  
  // Early exit for null/undefined
  if (!date) {
    console.warn(`⚠️ [${context}] Null/undefined date, using fallback`);
    return fallbackDate;
  }
  
  try {
    // Handle Date object - extract just the YYYY-MM-DD portion
    if (typeof date === 'object' && date instanceof Date) {
      // Create a date string in YYYY-MM-DD format without any timezone adjustments
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      const simpleDateString = `${year}-${month}-${day}`;
      
      console.log(`🔍 [${context}] Simplified date to YYYY-MM-DD:`, {
        original: date,
        simplified: simpleDateString
      });
      
      return simpleDateString;
    }
    
    // Handle string - extract just the YYYY-MM-DD portion if it's an ISO string
    if (typeof date === 'string') {
      if (date.includes('T')) {
        // It's an ISO string, extract just the date part
        const simpleDateString = date.split('T')[0];
        
        console.log(`🔍 [${context}] Extracted date from ISO string:`, {
          original: date,
          simplified: simpleDateString
        });
        
        return simpleDateString;
      }
      
      // It might already be a simple date string
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.log(`🔍 [${context}] Date is already in YYYY-MM-DD format:`, date);
        return date;
      }
      
      // Try to parse it as a date and convert to simple date string
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        
        const simpleDateString = `${year}-${month}-${day}`;
        
        console.log(`🔍 [${context}] Parsed string date to YYYY-MM-DD:`, {
          original: date,
          parsed: simpleDateString
        });
        
        return simpleDateString;
      }
    }
    
    // Invalid format
    console.warn(`⚠️ [${context}] Unrecognized date format:`, {
      value: date,
      type: typeof date
    });
    return fallbackDate;
    
  } catch (error) {
    console.error(`❌ [${context}] Date normalization error:`, error);
    return fallbackDate;
  }
};

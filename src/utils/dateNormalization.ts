/**
 * Normalizes a date value to an ISO string with validation and tracing
 * Handles timezone offsets consistently to prevent date shifts
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
    // IMPORTANT FIX: Use UTC methods to prevent timezone shifts
    if (typeof date === 'object' && date instanceof Date) {
      // Create a date string in YYYY-MM-DD format using UTC to prevent timezone shifts
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      
      const simpleDateString = `${year}-${month}-${day}`;
      
      console.log(`🔍 [${context}] Normalized to YYYY-MM-DD using UTC:`, {
        original: date,
        originalToString: date.toString(),
        originalISOString: date.toISOString(),
        normalized: simpleDateString,
        // Add extra info for debugging
        getDate: date.getDate(),
        getUTCDate: date.getUTCDate(),
        getMonth: date.getMonth(),
        getUTCMonth: date.getUTCMonth(),
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
      
      // Try to parse it as a date and convert to simple date string using UTC
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getUTCFullYear();
        const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const day = String(parsed.getUTCDate()).padStart(2, '0');
        
        const simpleDateString = `${year}-${month}-${day}`;
        
        console.log(`🔍 [${context}] Parsed string date to YYYY-MM-DD using UTC:`, {
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

/**
 * Normalizes a date value but preserves the time information
 * Used for features that need to display time-specific information
 */
export const normalizeDateWithTime = (date: Date | string | null, context: string = 'unknown'): string => {
  // Start with current date as fallback
  const fallbackDate = new Date().toISOString();
  
  // Log the incoming value for detailed tracing
  console.log(`🕒 [${context}] normalizeDateWithTime input:`, {
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
    // Handle Date object - keep the full ISO string with time
    if (typeof date === 'object' && date instanceof Date) {
      const isoString = date.toISOString();
      
      console.log(`🔍 [${context}] Normalized with time preservation:`, {
        original: date,
        originalToString: date.toString(),
        normalized: isoString
      });
      
      return isoString;
    }
    
    // Handle string - if it's already an ISO string with time, return as-is
    if (typeof date === 'string') {
      // Check if it already has time info
      if (date.includes('T')) {
        console.log(`🔍 [${context}] Already has time information:`, date);
        return date;
      }
      
      // If it's just a date (YYYY-MM-DD), append time
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const withTime = `${date}T12:00:00.000Z`;
        console.log(`🔍 [${context}] Added default time to date:`, {
          original: date,
          withTime: withTime
        });
        return withTime;
      }
      
      // Try to parse as date and keep time
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        const isoString = parsed.toISOString();
        
        console.log(`🔍 [${context}] Parsed string date with time:`, {
          original: date,
          parsed: isoString
        });
        
        return isoString;
      }
    }
    
    // Invalid format
    console.warn(`⚠️ [${context}] Unrecognized date format for time preservation:`, {
      value: date,
      type: typeof date
    });
    return fallbackDate;
    
  } catch (error) {
    console.error(`❌ [${context}] Date normalization with time error:`, error);
    return fallbackDate;
  }
};

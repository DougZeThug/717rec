
/**
 * Normalizes a date value to an ISO string with validation and tracing
 */
export const normalizeDate = (date: Date | string | null, context: string = 'unknown'): string => {
  // Start with current date as fallback
  const fallbackDate = new Date().toISOString();
  
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
    // Handle Date object
    if (typeof date === 'object' && date instanceof Date) {
      // Create a date string in YYYY-MM-DD format to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      // Create a normalized ISO date string with time at 00:00:00 in UTC
      const normalizedDate = `${year}-${month}-${day}T00:00:00.000Z`;
      
      console.log(`🔍 [${context}] Normalized date object to ISO string:`, {
        original: date,
        originalISO: date.toISOString(),
        normalized: normalizedDate
      });
      
      return normalizedDate;
    }
    
    // Handle string - ensure it's valid ISO
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        // Create a date string in YYYY-MM-DD format to avoid timezone issues
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        
        // Create a normalized ISO date string with time at 00:00:00 in UTC
        const normalizedDate = `${year}-${month}-${day}T00:00:00.000Z`;
        
        console.log(`🔍 [${context}] Normalized string date to ISO:`, {
          original: date,
          parsed: normalizedDate,
          isUnchanged: normalizedDate === date
        });
        
        return normalizedDate;
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

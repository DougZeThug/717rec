
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
      const isoString = date.toISOString();
      console.log(`🔍 [${context}] Converted Date object to ISO string:`, {
        original: date,
        normalized: isoString
      });
      return isoString;
    }
    
    // Handle string - ensure it's valid ISO
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        const isoString = parsed.toISOString();
        
        console.log(`🔍 [${context}] String date check:`, {
          original: date,
          parsed: isoString,
          isUnchanged: isoString === date
        });
        
        if (isoString !== date) {
          console.log(`🔍 [${context}] Reformatted string date to ISO:`, {
            original: date,
            normalized: isoString
          });
        }
        return isoString;
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
  } finally {
    // Always log the final result
    const result = typeof date === 'object' && date instanceof Date 
      ? date.toISOString() 
      : typeof date === 'string' && !isNaN(new Date(date).getTime())
        ? new Date(date).toISOString()
        : fallbackDate;
        
    console.log(`🕒 [${context}] normalizeDate result:`, {
      input: date,
      inputType: typeof date,
      output: result,
      outputType: typeof result
    });
  }
};

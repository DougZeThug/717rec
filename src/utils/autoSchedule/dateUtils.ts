
/**
 * Unified date handling utility for auto-schedule functionality
 * Prevents timezone issues and ensures consistent date formatting
 */

/**
 * Normalizes a date for auto-schedule database queries
 * Always returns YYYY-MM-DD format in local timezone
 */
export const normalizeScheduleDate = (date: Date | string | null, context: string = 'unknown'): string => {
  console.log(`🕒 [${context}] normalizeScheduleDate input:`, {
    value: date,
    type: typeof date,
    isDate: date instanceof Date,
    isString: typeof date === 'string',
    isNull: date === null
  });
  
  // Fallback to current date
  const fallbackDate = new Date().toISOString().split('T')[0];
  
  if (!date) {
    console.warn(`⚠️ [${context}] Null/undefined date, using fallback: ${fallbackDate}`);
    return fallbackDate;
  }
  
  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      console.warn(`⚠️ [${context}] Invalid date type, using fallback`);
      return fallbackDate;
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn(`⚠️ [${context}] Invalid date value, using fallback`);
      return fallbackDate;
    }
    
    // Format as YYYY-MM-DD using local timezone to prevent shifts
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    const normalizedDate = `${year}-${month}-${day}`;
    
    console.log(`✅ [${context}] Normalized date: ${normalizedDate}`, {
      original: date,
      dateObj: dateObj.toString(),
      normalized: normalizedDate
    });
    
    return normalizedDate;
  } catch (error) {
    console.error(`❌ [${context}] Date normalization error:`, error);
    return fallbackDate;
  }
};

/**
 * Validates that a date is not null and is a valid date
 */
export const validateScheduleDate = (date: Date | null, context: string = 'unknown'): boolean => {
  if (!date) {
    console.error(`❌ [${context}] Date validation failed: date is null/undefined`);
    return false;
  }
  
  if (!(date instanceof Date)) {
    console.error(`❌ [${context}] Date validation failed: not a Date instance`);
    return false;
  }
  
  if (isNaN(date.getTime())) {
    console.error(`❌ [${context}] Date validation failed: invalid date`);
    return false;
  }
  
  console.log(`✅ [${context}] Date validation passed: ${date.toISOString()}`);
  return true;
};

/**
 * Creates a safe date object at noon to prevent timezone edge cases
 */
export const createSafeScheduleDate = (date: Date): Date => {
  const safeDate = new Date(date);
  safeDate.setHours(12, 0, 0, 0);
  return safeDate;
};

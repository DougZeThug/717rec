
/**
 * Logger utility for timezone operations
 */

const DEBUG_MODE = true;

/**
 * Log a message with timezone-specific formatting
 */
export const logTimeOperation = (operation: string, data?: any): void => {
  if (!DEBUG_MODE) return;
  
  console.log(`🌐 ${operation}:`, data);
};

/**
 * Log a warning with timezone-specific formatting
 */
export const logTimeWarning = (message: string, data?: any): void => {
  console.warn(`⚠️ ${message}`, data || '');
};

/**
 * Log an error with timezone-specific formatting
 */
export const logTimeError = (message: string, error?: any): void => {
  console.error(`🚨 ${message}:`, error || '');
};

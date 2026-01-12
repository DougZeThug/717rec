/**
 * Logger types and constants
 * Separated to avoid circular dependencies
 */

// Log level control (can be overridden via environment variable)
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 99,
};

// Vite-compatible environment detection
export const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

export const LOG_LEVEL: LogLevel =
  (typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_LOG_LEVEL as LogLevel) : 'info') ||
  'info';

export const shouldLog = (level: LogLevel): boolean => {
  if (!isDev) return false;
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[LOG_LEVEL];
};

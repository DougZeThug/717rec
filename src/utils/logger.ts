/**
 * Structured logging utility for 717REC
 * All console.log statements should use these loggers for consistent formatting
 * and automatic suppression in production builds
 */

// Use Vite-compatible environment check
const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

// Base log function - only logs in development
export const log = (...args: unknown[]) =>
  isDev && console.log("[717REC]", ...args);

// Base error log - only logs in development
export const errorLog = (...args: unknown[]) =>
  isDev && console.error("[717REC ERROR]", ...args);

// Base warn log - only logs in development
export const warnLog = (...args: unknown[]) =>
  isDev && console.warn("[717REC WARN]", ...args);

// ============= Domain-Specific Loggers =============

// Bracket operations
export const bracketLog = (...args: unknown[]) =>
  log("🎲 Bracket:", ...args);

// Team operations
export const teamLog = (...args: unknown[]) =>
  log("👥 Team:", ...args);

// Challonge API operations
export const challongeLog = (...args: unknown[]) =>
  log("🏆 Challonge:", ...args);

// Match operations
export const matchLog = (...args: unknown[]) =>
  log("⚽ Match:", ...args);

// Authentication operations
export const authLog = (...args: unknown[]) =>
  log("🔐 Auth:", ...args);

// Score entry operations
export const scoreLog = (...args: unknown[]) =>
  log("📝 Score:", ...args);

// Admin operations
export const adminLog = (...args: unknown[]) =>
  log("⚙️ Admin:", ...args);

// Database/query operations
export const dbLog = (...args: unknown[]) =>
  log("💾 DB:", ...args);

// Scheduling operations
export const scheduleLog = (...args: unknown[]) =>
  log("📅 Schedule:", ...args);

// Season/history operations
export const historyLog = (...args: unknown[]) =>
  log("📜 History:", ...args);

// Routing operations
export const routeLog = (...args: unknown[]) =>
  log("🧭 Route:", ...args);

// Filter operations
export const filterLog = (...args: unknown[]) =>
  log("🔍 Filter:", ...args);

// Playoff operations
export const playoffLog = (...args: unknown[]) =>
  log("🏅 Playoff:", ...args);

// Badge operations
export const badgeLog = (...args: unknown[]) =>
  log("🏆 Badge:", ...args);

// ============= Status Loggers =============

// Progress logging for long operations
export const progressLog = (step: number, total: number, message: string, details?: string) => {
  log(`📊 Progress ${step}/${total}: ${message}`);
  if (details) log(`   ${details}`);
};

// Success logging
export const successLog = (operation: string, details?: string) => {
  log(`✅ ${operation} completed successfully`);
  if (details) log(`   ${details}`);
};

// Failure logging
export const failureLog = (operation: string, error: string | Error) => {
  errorLog(`❌ ${operation} failed:`, error);
};

// ============= Supabase-Specific Logging =============

// Supabase error logging with structured output
export const supabaseErrorLog = (operation: string, error: unknown) => {
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as { code?: string; message?: string; details?: string; hint?: string; statusCode?: number };
    errorLog(`🔴 Supabase Error in ${operation}:`, {
      code: supabaseError.code,
      message: supabaseError.message,
      details: supabaseError.details,
      hint: supabaseError.hint,
      statusCode: supabaseError.statusCode
    });
  } else {
    errorLog(`❌ ${operation} error:`, error);
  }
};

// ============= Verbose Debug Logging =============
// Only use for detailed debugging - more verbose than normal logs

export const debugLog = (...args: unknown[]) =>
  isDev && console.log("[717REC DEBUG]", ...args);

// Diagnostic logging for troubleshooting
export const diagnosticLog = (context: string, data: Record<string, unknown>) =>
  isDev && console.log(`[717REC DIAGNOSTIC] ${context}:`, data);

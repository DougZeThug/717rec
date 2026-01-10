/**
 * Centralized logging utilities for 717REC
 * Provides:
 *  - Consistent log formatting
 *  - Environment-based log level filtering
 *  - Domain-specific loggers for easy filtering
 *  - Automatic production log suppression
 */

import { captureError, captureMessage } from '@/utils/sentry';

// Vite-compatible environment detection
const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

// Log level control (can be overridden via environment variable)
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';
const LOG_LEVEL: LogLevel =
  (typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_LOG_LEVEL as LogLevel) : 'info') ||
  'info';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 99,
};

const shouldLog = (level: LogLevel): boolean => {
  if (!isDev) return false;
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[LOG_LEVEL];
};

// Base logging functions
export const log = (...args: unknown[]) => {
  if (shouldLog('info')) console.log('[717REC]', ...args);
};

export const errorLog = (...args: unknown[]) => {
  // Always log errors in dev mode
  if (shouldLog('error')) console.error('[717REC ERROR]', ...args);

  // In production, send to Sentry
  if (!isDev && args.length > 0) {
    try {
      // Find Error in any argument position (not just first)
      const errorArg = args.find((arg) => arg instanceof Error);
      const messageArg = args.find((arg) => typeof arg === 'string');

      if (errorArg instanceof Error) {
        captureError(errorArg, {
          message: messageArg,
          additionalArgs: args.filter((a) => a !== errorArg && a !== messageArg),
        });
      } else if (messageArg) {
        captureMessage(String(messageArg), 'error');
      }
    } catch {
      // Sentry not available, silently fail
    }
  }
};

export const warnLog = (...args: unknown[]) => {
  if (shouldLog('warn')) console.warn('[717REC WARN]', ...args);
};

export const debugLog = (...args: unknown[]) => {
  if (shouldLog('debug')) console.log('[717REC DEBUG]', ...args);
};

// ============================================
// Domain-specific loggers
// ============================================

// Auth operations
export const authLog = (...args: unknown[]) => log('🔐 Auth:', ...args);

// Bracket operations
export const bracketLog = (...args: unknown[]) => log('🎲 Bracket:', ...args);

// Match operations
export const matchLog = (...args: unknown[]) => log('🎯 Match:', ...args);

// Team operations
export const teamLog = (...args: unknown[]) => log('👥 Team:', ...args);

// Playoffs operations
export const playoffLog = (...args: unknown[]) => log('🏆 Playoff:', ...args);

// Score operations
export const scoreLog = (...args: unknown[]) => log('📊 Score:', ...args);

// Badge operations
export const badgeLog = (...args: unknown[]) => log('🏅 Badge:', ...args);

// Database operations
export const dbLog = (...args: unknown[]) => log('💾 DB:', ...args);

// Schedule operations
export const scheduleLog = (...args: unknown[]) => log('📅 Schedule:', ...args);

// Admin operations
export const adminLog = (...args: unknown[]) => log('⚡ Admin:', ...args);

// Challonge operations
export const challongeLog = (...args: unknown[]) => log('🎮 Challonge:', ...args);

// Timezone operations
export const timezoneLog = (...args: unknown[]) => log('🌐 Timezone:', ...args);

// Chart/visualization operations
export const chartLog = (...args: unknown[]) => log('📈 Chart:', ...args);

// Validation operations
export const validationLog = (...args: unknown[]) => log('✓ Validation:', ...args);

// Image loading operations (used in onError handlers)
export const imageErrorLog = (teamName: string, imageUrl: string | null | undefined) =>
  warnLog('🖼️ Image:', `Failed to load image for ${teamName}:`, imageUrl || 'no URL');

// Cache operations
export const cacheLog = (...args: unknown[]) => log('💨 Cache:', ...args);

// Route/navigation operations
export const routeLog = (...args: unknown[]) => log('🧭 Route:', ...args);

// Filter operations
export const filterLog = (...args: unknown[]) => log('🔍 Filter:', ...args);

// ============================================
// Status loggers
// ============================================

export const progressLog = (step: number, total: number, message: string, details?: string) => {
  if (!isDev) return;
  const percentage = Math.round((step / total) * 100);
  log(`[${step}/${total}] ${percentage}% - ${message}`, details || '');
};

export const successLog = (operation: string, details?: string) =>
  log(`✅ ${operation}`, details || '');

export const failureLog = (operation: string, error: string | Error) =>
  errorLog(`❌ ${operation}:`, error instanceof Error ? error.message : error);

// ============================================
// Supabase-specific logging
// ============================================

export const supabaseErrorLog = (operation: string, error: unknown) => {
  if (!isDev) return;

  if (error && typeof error === 'object' && 'message' in error) {
    const supabaseError = error as { message: string; code?: string; details?: string };
    errorLog(`Supabase ${operation} failed:`, {
      code: supabaseError.code,
      message: supabaseError.message,
      details: supabaseError.details,
    });
  } else {
    errorLog(`Supabase ${operation} failed:`, error);
  }
};

// ============================================
// Diagnostic logging
// ============================================

export const diagnosticLog = (context: string, data: Record<string, unknown>) =>
  isDev && console.log(`[717REC DIAGNOSTIC] ${context}:`, data);

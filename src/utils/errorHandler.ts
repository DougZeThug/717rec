/**
 * Error handling utilities for service layer
 * Provides consistent error handling patterns across all services
 */

import { PostgrestError } from '@supabase/supabase-js';

import {
  AuthorizationError,
  DatabaseError,
  NotFoundError,
  ServiceError,
  ValidationError,
} from '@/types/errors';

import { errorLog } from './logger';

/**
 * Handles Supabase/Postgrest errors and throws appropriate ServiceError
 * @param error - The Supabase error object
 * @param context - Additional context about what operation failed
 * @throws {DatabaseError} - Always throws a DatabaseError
 */
export function handleDatabaseError(error: PostgrestError, context: string): never {
  errorLog(`${context}:`, error);
  throw new DatabaseError(`${context}: ${error.message}`, {
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

/**
 * Handles missing data scenarios (when a required resource isn't found)
 * @param data - The data that might be null/undefined
 * @param resourceName - Name of the resource for error message
 * @param identifier - Optional identifier (ID) of the resource
 * @throws {NotFoundError} - Throws if data is null/undefined
 * @returns The data if it exists
 */
export function ensureFound<T>(
  data: T | null | undefined,
  resourceName: string,
  identifier?: string
): T {
  if (data === null || data === undefined) {
    throw new NotFoundError(resourceName, identifier);
  }
  return data;
}

/**
 * Wraps an async operation with consistent error handling
 * Logs errors and re-throws them as ServiceErrors
 * @param operation - The async operation to execute
 * @param context - Description of what's being done (for logging)
 * @returns The result of the operation
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ServiceError) {
      // Already a ServiceError, just re-throw
      throw error;
    }

    // Wrap unknown errors in ServiceError
    errorLog(`${context}:`, error);
    throw new ServiceError(
      `${context}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN_ERROR',
      error
    );
  }
}

/**
 * Checks if an error is a specific type of ServiceError
 */
export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

/**
 * Checks if an error is a DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

/**
 * Checks if an error is a NotFoundError
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

// ─── General-purpose error utilities ────────────────────────────────────────

/**
 * Safely extract an error message from any thrown value
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

/**
 * Convert any error to a string, or null if there is no error
 */
export function convertErrorToString(error: unknown): string | null {
  if (error === null || error === undefined) return null;
  return getErrorMessage(error);
}

/**
 * Get a user-facing error message, optionally prefixed with context
 */
export function getUIErrorMessage(error: unknown, context?: string): string {
  const message = getErrorMessage(error);
  return context ? `${context}: ${message}` : message;
}

/**
 * Log an error consistently via the app logger
 */
export function logError(error: unknown, context: string, additionalData?: unknown): void {
  if (error instanceof Error) {
    errorLog(`${context}:`, error, additionalData);
  } else {
    errorLog(`${context}:`, getErrorMessage(error), additionalData);
  }
}

// ─── Hook-level error handling ───────────────────────────────────────────────

export interface HookErrorResult {
  message: string;
  userMessage: string;
  category: string;
}

/**
 * Categorize and log an error for use inside React hooks.
 * Returns structured information suitable for toast messages and state.
 */
export function handleHookError(error: unknown, context: string): HookErrorResult {
  const message = getErrorMessage(error);

  let category = 'unknown';
  let userMessage = 'An unexpected error occurred. Please try again.';

  if (error instanceof DatabaseError) {
    category = 'database';
    userMessage = 'Database operation failed. Please try again or contact support.';
  } else if (error instanceof ValidationError) {
    category = 'validation';
    userMessage = message;
  } else if (error instanceof AuthorizationError) {
    category = 'authorization';
    userMessage = 'You do not have permission to perform this action.';
  } else if (error instanceof NotFoundError) {
    category = 'not_found';
    userMessage = message;
  } else if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
    category = 'network';
    userMessage = 'Network error. Please check your connection and try again.';
  }

  errorLog(`${context}:`, error);

  return { message, userMessage, category };
}

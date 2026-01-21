/**
 * Error handling utilities for service layer
 * Provides consistent error handling patterns across all services
 */

import { PostgrestError } from '@supabase/supabase-js';
import { DatabaseError, NotFoundError, ServiceError } from '@/types/errors';
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

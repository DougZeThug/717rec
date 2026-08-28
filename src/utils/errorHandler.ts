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

/** Shown whenever we have nothing safe and specific to tell the user. */
const GENERIC_REASON = 'Something went wrong. Please try again.';
const PERMISSION_REASON = 'You do not have permission to do this.';

/**
 * Postgres/PostgREST codes we can translate into something a league admin can
 * act on. Anything not listed here stays generic: raw database text names
 * tables, constraints and RLS policies, which must never reach a user.
 */
const POSTGRES_REASONS: Record<string, string> = {
  '23505': 'That already exists. Give it a different name and try again.',
  '23502': 'A required field is missing.',
  '23503': "This is still linked to other records, so it can't be changed yet.",
  '23514': "Some of those values aren't allowed. Check the form and try again.",
  '42501': PERMISSION_REASON,
  PGRST301: PERMISSION_REASON,
  PGRST116: 'That record no longer exists. Refresh and try again.',
};

interface ErrorDescription {
  /** Safe to show a user. */
  message: string;
  /** True when `message` says something more useful than "it failed". */
  isSpecific: boolean;
}

/** Duck-type a raw PostgrestError, which is a plain object rather than an Error. */
function isPostgrestErrorShape(error: unknown): error is { code?: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    'details' in error &&
    'code' in error
  );
}

/**
 * Translate a database failure using its Postgres code.
 *
 * `rawMessage` is scanned only for the RLS phrase, and only here — this is the
 * one place raw database text is in hand. Never pattern-match a DatabaseError
 * message for words like "fetch" or "network": most contexts read
 * "Failed to fetch ...", so that would mislabel permission errors.
 */
function describeDatabaseError(code: string | undefined, rawMessage: string): ErrorDescription {
  const mapped = code ? POSTGRES_REASONS[code] : undefined;
  if (mapped) return { message: mapped, isSpecific: true };

  // Postgres writes this both hyphenated ("row-level security policy") and not,
  // depending on the message, so match either.
  if (/row[- ]level security/i.test(rawMessage)) {
    return { message: PERMISSION_REASON, isSpecific: true };
  }

  return { message: GENERIC_REASON, isSpecific: false };
}

/**
 * Reduce any thrown value to something safe to show.
 *
 * Class first, then the Postgres code. Note that `DatabaseError.code` is the
 * literal 'DATABASE_ERROR' — the Postgres code lives in `details.code`, put
 * there by handleDatabaseError. Reading `.code` here would silently classify
 * every wrapped database error as generic.
 *
 * A bare Error stays generic on purpose: it may be a parse failure or a
 * third-party throw. A service that wants its message shown should throw one
 * of the typed errors in `@/types/errors`.
 */
function describeError(error: unknown): ErrorDescription {
  if (error instanceof ServiceError) {
    switch (error.code) {
      case 'DATABASE_ERROR': {
        const details = error.details as { code?: string } | undefined;
        return describeDatabaseError(details?.code, error.message);
      }
      case 'UNKNOWN_ERROR':
        // withErrorHandling wrapping an arbitrary throwable.
        return { message: GENERIC_REASON, isSpecific: false };
      case 'AUTHORIZATION_ERROR':
        return { message: PERMISSION_REASON, isSpecific: true };
      default:
        // Every other ServiceError subclass carries an authored message
        // written for a user: ValidationError, NotFoundError,
        // BusinessLogicError, DuplicateRoundError and the migration guards.
        return { message: error.message, isSpecific: true };
    }
  }

  if (isPostgrestErrorShape(error)) {
    return describeDatabaseError(error.code, error.message);
  }

  return { message: GENERIC_REASON, isSpecific: false };
}

/**
 * Get a user-facing error message, optionally prefixed with context.
 *
 * `context` is a lead-in phrase with no terminal punctuation, e.g.
 * 'Failed to save round'. When the reason is specific the two are joined with
 * a colon; when it is not, the caller's phrase is used on its own so the user
 * is not shown raw database internals.
 */
export function getUIErrorMessage(error: unknown, context?: string): string {
  const { message, isSpecific } = describeError(error);
  if (!context) return message;
  return isSpecific ? `${context}: ${message}` : `${context}. Please try again.`;
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

import type { ErrorLike } from '../types/BracketServiceTypes';

/**
 * Type guard to check if error is an ErrorLike object
 */
export function isErrorLike(error: unknown): error is ErrorLike {
  return error !== null && typeof error === 'object';
}

/**
 * Safely serialize any error type to a readable string
 */
export function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    // Try to extract meaningful info from plain objects
    if (isErrorLike(error)) {
      const parts: string[] = [];

      // Common error properties
      if (error.message) parts.push(`Message: ${error.message}`);
      if (error.code) parts.push(`Code: ${error.code}`);
      if (error.details) parts.push(`Details: ${error.details}`);
      if (error.hint) parts.push(`Hint: ${error.hint}`);
      if (error.table) parts.push(`Table: ${error.table}`);
      if (error.operation) parts.push(`Operation: ${error.operation}`);

      if (parts.length > 0) {
        return parts.join(' | ');
      }

      // Fallback: full JSON
      return JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
    }

    return String(error);
  } catch {
    return 'Unable to serialize error';
  }
}

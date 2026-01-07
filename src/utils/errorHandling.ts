/**
 * Consolidated Error Handling Utilities
 * 
 * This module provides standardized error handling patterns:
 * - Services: Always throw errors (use SupabaseError, etc.)
 * - Hooks: Catch errors, show toast, return error state
 * - Components: Read error state, display ErrorDisplay
 */

// Re-export existing error utilities
export {
  ChallongeError,
  SupabaseError,
  BracketValidationError,
  TeamValidationError,
  MatchSyncError,
  isChallongeError,
  isSupabaseError,
  isBracketValidationError,
  getErrorMessage,
  ensureErrorString,
  convertErrorToString,
  categorizeError,
  processError,
  getUIErrorMessage,
  logError,
} from './errors';

// Re-export retry utilities
export {
  withRetry,
  shouldRetryError,
  formatUserError,
  categorizeError as categorizeMutationError,
} from '@/components/playoffs/form/bracket-teams/utils/mutationErrorHandling';

import { SupabaseError, categorizeError, getErrorMessage } from './errors';
import { errorLog } from './logger';

/**
 * Create a standardized service error
 * Use this in services when throwing errors from Supabase operations
 */
export function createServiceError(
  operation: string,
  table: string,
  originalError: unknown
): SupabaseError {
  const message = getErrorMessage(originalError);
  errorLog(`Service error in ${operation} on ${table}:`, originalError);
  return new SupabaseError(message, table, operation);
}

/**
 * Result type for hook error handling
 */
export interface HookErrorResult {
  message: string;
  userMessage: string;
  category: string;
}

/**
 * Handle errors in hooks with consistent logging and messaging
 * Returns user-friendly error information
 */
export function handleHookError(
  error: unknown,
  context: string
): HookErrorResult {
  const { category, message, userMessage } = categorizeError(error);
  errorLog(`${context}:`, error);
  
  return {
    message,
    userMessage,
    category,
  };
}

/**
 * Type guard to check if a value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Safely extract error message for state
 */
export function getErrorForState(error: unknown): string {
  const { userMessage } = categorizeError(error);
  return userMessage;
}

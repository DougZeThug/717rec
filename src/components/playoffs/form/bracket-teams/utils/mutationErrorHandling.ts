import { PostgrestError } from '@supabase/supabase-js';

export interface ErrorCategory {
  type: 'network' | 'validation' | 'permission' | 'conflict' | 'server' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface ErrorHandlingResult {
  category: ErrorCategory;
  shouldRetry: boolean;
  retryDelay: number;
  userAction?: string;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

// Error pattern matching
const ERROR_PATTERNS = {
  network: [/network/i, /connection/i, /timeout/i, /fetch/i, /ECONNRESET/i, /ENOTFOUND/i],
  validation: [
    /invalid.*seed/i,
    /constraint.*violation/i,
    /check constraint/i,
    /not null violation/i,
    /foreign key/i,
  ],
  permission: [/permission/i, /unauthorized/i, /access.*denied/i, /row.*level.*security/i, /rls/i],
  conflict: [/duplicate/i, /unique.*constraint/i, /already.*exists/i, /conflict/i],
  server: [/internal.*server/i, /500/i, /502/i, /503/i, /504/i],
};

/**
 * Categorize an error based on its message and properties
 */
export const categorizeError = (error: unknown): ErrorCategory => {
  const errorMessage = getErrorMessage(error);
  const errorCode = getErrorCode(error);

  // Check for specific Supabase errors
  if (isSupabaseError(error)) {
    return categorizeSupabaseError(error);
  }

  // Check against pattern categories
  for (const [category, patterns] of Object.entries(ERROR_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(errorMessage) || pattern.test(errorCode))) {
      return createErrorCategory(category as keyof typeof ERROR_PATTERNS, errorMessage);
    }
  }

  // Default to unknown category
  return {
    type: 'unknown',
    severity: 'medium',
    retryable: true,
    userMessage: 'An unexpected error occurred. Please try again.',
    technicalMessage: errorMessage,
  };
};

/**
 * Determine if an error should be retried and calculate delay
 */
export const shouldRetryError = (
  error: unknown,
  attemptCount: number,
  config: Partial<RetryConfig> = {}
): ErrorHandlingResult => {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const category = categorizeError(error);

  const shouldRetry =
    category.retryable &&
    attemptCount < retryConfig.maxAttempts &&
    category.severity !== 'critical';

  const retryDelay = shouldRetry
    ? Math.min(
        retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attemptCount),
        retryConfig.maxDelay
      )
    : 0;

  return {
    category,
    shouldRetry,
    retryDelay,
    userAction: getUserAction(category),
  };
};

/**
 * Create a user-friendly error message with actionable steps
 */
export const formatUserError = (error: unknown, context?: string): string => {
  const category = categorizeError(error);
  const contextPrefix = context ? `${context}: ` : '';

  return `${contextPrefix}${category.userMessage}`;
};

/**
 * Execute a function with retry logic
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> => {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt < retryConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryResult = shouldRetryError(error, attempt, retryConfig);

      if (!retryResult.shouldRetry) {
        throw error;
      }

      // Wait before retrying
      if (retryResult.retryDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryResult.retryDelay));
      }
    }
  }

  throw lastError;
};

// Helper functions

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Unknown error';
}

function getErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }
  return '';
}

function isSupabaseError(error: unknown): error is PostgrestError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    'details' in error
  );
}

function categorizeSupabaseError(error: PostgrestError): ErrorCategory {
  const code = error.code;
  const message = error.message.toLowerCase();

  // Specific Supabase error codes
  switch (code) {
    case '23505': // unique_violation
      return {
        type: 'conflict',
        severity: 'medium',
        retryable: false,
        userMessage: 'This seed value is already in use. Please choose a different one.',
        technicalMessage: error.message,
      };

    case '23503': // foreign_key_violation
      return {
        type: 'validation',
        severity: 'high',
        retryable: false,
        userMessage: 'Invalid team reference. Please refresh and try again.',
        technicalMessage: error.message,
      };

    case '23514': // check_violation
      return {
        type: 'validation',
        severity: 'medium',
        retryable: false,
        userMessage: 'Invalid seed value. Seeds must be positive numbers.',
        technicalMessage: error.message,
      };

    case '42501': // insufficient_privilege
      return {
        type: 'permission',
        severity: 'critical',
        retryable: false,
        userMessage: 'You do not have permission to update team seeds.',
        technicalMessage: error.message,
      };

    default:
      // Check message patterns for unhandled codes
      if (message.includes('row level security')) {
        return {
          type: 'permission',
          severity: 'high',
          retryable: false,
          userMessage: 'Access denied. Please check your permissions.',
          technicalMessage: error.message,
        };
      }

      return {
        type: 'server',
        severity: 'medium',
        retryable: true,
        userMessage: 'Database error occurred. Please try again.',
        technicalMessage: error.message,
      };
  }
}

function createErrorCategory(type: keyof typeof ERROR_PATTERNS, message: string): ErrorCategory {
  const categoryMap: Record<
    keyof typeof ERROR_PATTERNS,
    Omit<ErrorCategory, 'technicalMessage'>
  > = {
    network: {
      type: 'network',
      severity: 'medium',
      retryable: true,
      userMessage: 'Network connection issue. Please check your internet and try again.',
    },
    validation: {
      type: 'validation',
      severity: 'medium',
      retryable: false,
      userMessage: 'Invalid data provided. Please check your input and try again.',
    },
    permission: {
      type: 'permission',
      severity: 'high',
      retryable: false,
      userMessage: 'You do not have permission to perform this action.',
    },
    conflict: {
      type: 'conflict',
      severity: 'medium',
      retryable: false,
      userMessage: 'Conflicting data detected. Please refresh and try again.',
    },
    server: {
      type: 'server',
      severity: 'high',
      retryable: true,
      userMessage: 'Server error occurred. Please try again in a moment.',
    },
  };

  return {
    ...categoryMap[type],
    technicalMessage: message,
  };
}

function getUserAction(category: ErrorCategory): string | undefined {
  switch (category.type) {
    case 'network':
      return 'Check your internet connection and try again';
    case 'validation':
      return 'Please review your input and correct any errors';
    case 'permission':
      return 'Contact an administrator for access';
    case 'conflict':
      return 'Refresh the page and try again';
    case 'server':
      return 'Wait a moment and try again';
    default:
      return undefined;
  }
}

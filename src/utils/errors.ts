export class ChallongeError extends Error {
  constructor(message: string, public readonly operation?: string) {
    super(message);
    this.name = 'ChallongeError';
  }
}

export class SupabaseError extends Error {
  constructor(message: string, public readonly table?: string, public readonly operation?: string) {
    super(message);
    this.name = 'SupabaseError';
  }
}

export class BracketValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'BracketValidationError';
  }
}

export class TeamValidationError extends Error {
  constructor(message: string, public readonly teamId?: string) {
    super(message);
    this.name = 'TeamValidationError';
  }
}

export class MatchSyncError extends Error {
  constructor(message: string, public readonly matchId?: string) {
    super(message);
    this.name = 'MatchSyncError';
  }
}

// Error handling utilities
export function isChallongeError(error: unknown): error is ChallongeError {
  return error instanceof ChallongeError;
}

export function isSupabaseError(error: unknown): error is SupabaseError {
  return error instanceof SupabaseError;
}

export function isBracketValidationError(error: unknown): error is BracketValidationError {
  return error instanceof BracketValidationError;
}

// Error message extraction utility
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

// Error categorization for user-friendly messages
export function categorizeError(error: unknown): {
  category: 'challonge' | 'database' | 'validation' | 'network' | 'unknown';
  message: string;
  userMessage: string;
} {
  if (isChallongeError(error)) {
    return {
      category: 'challonge',
      message: error.message,
      userMessage: 'Failed to communicate with Challonge. Please check your API configuration.'
    };
  }
  
  if (isSupabaseError(error)) {
    return {
      category: 'database',
      message: error.message,
      userMessage: 'Database operation failed. Please try again or contact support.'
    };
  }
  
  if (isBracketValidationError(error)) {
    return {
      category: 'validation',
      message: error.message,
      userMessage: error.message // Validation errors are already user-friendly
    };
  }
  
  const message = getErrorMessage(error);
  
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
    return {
      category: 'network',
      message,
      userMessage: 'Network error. Please check your connection and try again.'
    };
  }
  
  return {
    category: 'unknown',
    message,
    userMessage: 'An unexpected error occurred. Please try again.'
  };
}

// Enhanced error handling utilities for consistent error processing
export function processError(error: unknown): {
  message: string;
  originalError: Error | null;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      originalError: error
    };
  }
  
  if (typeof error === 'string') {
    return {
      message: error,
      originalError: null
    };
  }
  
  return {
    message: 'An unknown error occurred',
    originalError: null
  };
}

// Utility to safely extract error messages for UI display
export function getUIErrorMessage(error: unknown, context?: string): string {
  const processed = processError(error);
  
  if (context) {
    return `${context}: ${processed.message}`;
  }
  
  return processed.message;
}

// Utility to log errors consistently
export function logError(error: unknown, context: string, additionalData?: any): void {
  const processed = processError(error);
  
  console.error(`${context}:`, {
    message: processed.message,
    originalError: processed.originalError,
    context,
    additionalData
  });
}

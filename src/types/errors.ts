/**
 * Standardized error types for service layer
 * All services should throw these error types for consistent error handling
 */

/**
 * Base class for all service errors
 */
export class ServiceError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'SERVICE_ERROR', details?: unknown) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceError);
    }
  }
}

/**
 * Database operation errors (Supabase queries, mutations)
 */
export class DatabaseError extends ServiceError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends ServiceError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with ID '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', { resource, identifier });
    this.name = 'NotFoundError';
  }
}

/**
 * Validation errors (invalid input, missing required fields)
 */
export class ValidationError extends ServiceError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Authorization errors (insufficient permissions)
 */
export class AuthorizationError extends ServiceError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Business logic errors (invalid state transitions, rule violations)
 */
export class BusinessLogicError extends ServiceError {
  constructor(message: string, details?: unknown) {
    super(message, 'BUSINESS_LOGIC_ERROR', details);
    this.name = 'BusinessLogicError';
  }
}

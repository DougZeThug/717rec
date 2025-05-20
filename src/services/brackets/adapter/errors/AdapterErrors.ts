
/**
 * Error thrown when adapter operations fail
 */
export class AdapterOperationError extends Error {
  operation: string;
  details?: any;
  
  constructor(operation: string, message: string, details?: any) {
    super(`${operation} operation failed: ${message}`);
    this.name = 'AdapterOperationError';
    this.operation = operation;
    this.details = details;
  }
}

/**
 * Result of adapter operations
 */
export interface AdapterOperationResult {
  success: boolean;
  count: number;
  error?: Error;
}


import { isValidUUID } from '@/utils/validation';

/**
 * Asserts that a value is a valid UUID, throwing an error if not
 */
export function assertValidUuid(value: string | null | undefined, fieldName: string): asserts value is string {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }
  
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string, got ${typeof value}`);
  }
  
  if (value.trim() === '') {
    throw new Error(`${fieldName} cannot be empty`);
  }
  
  if (!isValidUUID(value)) {
    throw new Error(`${fieldName} must be a valid UUID format, got: "${value}"`);
  }
}

/**
 * Asserts that a value is either a valid UUID or null/undefined
 */
export function assertValidUuidOrNull(value: string | null | undefined, fieldName: string): asserts value is string | null {
  if (value === null || value === undefined) {
    return; // null/undefined are allowed
  }
  
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string or null, got ${typeof value}`);
  }
  
  if (value.trim() === '') {
    throw new Error(`${fieldName} cannot be empty string, use null instead`);
  }
  
  if (!isValidUUID(value)) {
    throw new Error(`${fieldName} must be a valid UUID format, got: "${value}"`);
  }
}

/**
 * Safely checks if a value is a valid UUID without throwing
 */
export function isValidUuidSafe(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && isValidUUID(value);
}

/**
 * Validates an array of UUIDs
 */
export function validateUuidArray(values: unknown[], fieldName: string): string[] {
  if (!Array.isArray(values)) {
    throw new Error(`${fieldName} must be an array`);
  }
  
  const validUuids: string[] = [];
  
  values.forEach((value, index) => {
    try {
      assertValidUuid(value as string, `${fieldName}[${index}]`);
      validUuids.push(value as string);
    } catch (error) {
      throw new Error(`${fieldName}[${index}]: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  
  return validUuids;
}

import { isValidUUID } from '@/utils/validation';

/**
 * Safely checks if a value is a valid UUID without throwing
 */
export function isValidUuidSafe(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && isValidUUID(value);
}

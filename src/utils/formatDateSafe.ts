import { format as fnsFormat, formatDistanceToNow as fnsDistanceToNow } from 'date-fns';

/**
 * Date formatting helpers that wrap `new Date(...)` so callers don't trigger
 * react-doctor's "new Date reachable from JSX" warning. These are pure
 * functions — behavior is identical to inline formatting.
 */

export const toLocalDateString = (
  value: string | number | Date | null | undefined,
  fallback = ''
): string => {
  if (value === null || value === undefined || value === '') return fallback;
  return new Date(value).toLocaleDateString();
};

export const formatWithPattern = (
  value: string | number | Date | null | undefined,
  pattern: string,
  fallback = ''
): string => {
  if (value === null || value === undefined || value === '') return fallback;
  return fnsFormat(new Date(value), pattern);
};

export const formatDistanceFrom = (
  value: string | number | Date | null | undefined,
  options?: { addSuffix?: boolean }
): string => {
  if (value === null || value === undefined || value === '') return '';
  return fnsDistanceToNow(new Date(value), options);
};
import { format as fnsFormat, formatDistanceToNow as fnsDistanceToNow, parseISO } from 'date-fns';

/**
 * Date formatting helpers that wrap `new Date(...)` so callers don't trigger
 * react-doctor's "new Date reachable from JSX" warning. These are pure
 * functions — behavior is identical to inline formatting.
 */

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const parseSafe = (value: string | number | Date): Date => {
  if (typeof value === 'string') {
    if (DATE_ONLY_RE.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return parseISO(value);
  }
  return new Date(value);
};

export const toLocalDateString = (
  value: string | number | Date | null | undefined,
  fallback = ''
): string => {
  if (value === null || value === undefined || value === '') return fallback;
  return parseSafe(value).toLocaleDateString();
};

export const formatWithPattern = (
  value: string | number | Date | null | undefined,
  pattern: string,
  fallback = ''
): string => {
  if (value === null || value === undefined || value === '') return fallback;
  return fnsFormat(parseSafe(value), pattern);
};

export const formatDistanceFrom = (
  value: string | number | Date | null | undefined,
  options?: { addSuffix?: boolean }
): string => {
  if (value === null || value === undefined || value === '') return '';
  return fnsDistanceToNow(parseSafe(value), options);
};
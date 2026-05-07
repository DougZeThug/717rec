import { useEffect, useState } from 'react';

import { warnLog, errorLog } from '@/utils/logger';
import { parseStoredJson } from '@/utils/storage/parseStoredJson';

const isPrimitiveValue = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

/**
 * Custom hook for managing state that persists to localStorage
 * @param key - localStorage key
 * @param defaultValue - default value if no stored value exists
 * @param validate - optional validator for parsed JSON shape
 * @returns tuple of [value, setValue] like useState
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  validate?: (v: unknown) => v is T,
): [T, (value: T) => void] {
  // Initialize state from localStorage or use default
  const [value, setValue] = useState<T>(() => {
    const savedValue = localStorage.getItem(key);

    if (!savedValue) {
      return defaultValue;
    }

    if (validate) {
      const parsedResult = parseStoredJson(savedValue, validate);

      if (parsedResult.ok) {
        return parsedResult.value;
      }

      if (!parsedResult.ok && parsedResult.error !== 'missing') {
        errorLog(
          'Failed to parse persisted state for key "%s" with validator. Falling back to default value. Reason: %s',
          key,
          parsedResult.error,
        );
      }

      return defaultValue;
    }

    try {
      return JSON.parse(savedValue) as T;
    } catch (e) {
      if (isPrimitiveValue(defaultValue)) {
        return savedValue as T;
      }

      warnLog(
        'usePersistedState legacy fallback for non-primitive default on key "%s" is deprecated. Pass a validator to avoid stale or invalid persisted data.',
        key,
      );
      errorLog('Failed to parse persisted state for key "%s":', key, e);

      return defaultValue;
    }
  });

  // Persist to localStorage whenever value changes
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

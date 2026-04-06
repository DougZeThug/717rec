import { useEffect, useState } from 'react';

import { errorLog } from '@/utils/logger';

/**
 * Custom hook for managing state that persists to localStorage
 * @param key - localStorage key
 * @param defaultValue - default value if no stored value exists
 * @returns tuple of [value, setValue] like useState
 */
export function usePersistedState<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  // Initialize state from localStorage or use default
  const [value, setValue] = useState<T>(() => {
    const savedValue = localStorage.getItem(key);
    if (savedValue) {
      try {
        return JSON.parse(savedValue) as T;
      } catch (e) {
        errorLog('Failed to parse persisted state for key "%s":', key, e);
        // If parsing fails, treat as string
        return savedValue as T;
      }
    }
    return defaultValue;
  });

  // Persist to localStorage whenever value changes
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePersistedState } from '@/hooks/usePersistedState';

const mockErrorLog = vi.fn();

vi.mock('@/utils/logger', () => ({
  errorLog: (...args: unknown[]) => mockErrorLog(...args),
  warnLog: vi.fn(),
}));

describe('usePersistedState', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns default value when key is missing', () => {
    const { result } = renderHook(() => usePersistedState('missing-key', 'default-value'));

    expect(result.current[0]).toBe('default-value');
  });

  it('returns parsed value when stored JSON is valid', () => {
    localStorage.setItem('persisted-key', JSON.stringify({ theme: 'dark' }));
    const isTheme = (value: unknown): value is { theme: string } => {
      if (typeof value !== 'object' || value === null) {
        return false;
      }

      return typeof (value as { theme?: unknown }).theme === 'string';
    };

    const { result } = renderHook(() =>
      usePersistedState('persisted-key', { theme: 'light' }, isTheme),
    );

    expect(result.current[0]).toEqual({ theme: 'dark' });
  });

  it('returns default and logs when stored JSON is malformed', () => {
    localStorage.setItem('persisted-key', '{');
    const isTheme = (value: unknown): value is { theme: string } => {
      if (typeof value !== 'object' || value === null) {
        return false;
      }

      return typeof (value as { theme?: unknown }).theme === 'string';
    };

    const { result } = renderHook(() =>
      usePersistedState('persisted-key', { theme: 'light' }, isTheme),
    );

    expect(result.current[0]).toEqual({ theme: 'light' });
    expect(mockErrorLog).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse persisted state for key "%s" with validator.'),
      'persisted-key',
      'invalid_json',
    );
  });

  it('returns default and logs when parsed value fails validator', () => {
    localStorage.setItem('persisted-key', JSON.stringify({ theme: 42 }));
    const isTheme = (value: unknown): value is { theme: string } => {
      if (typeof value !== 'object' || value === null) {
        return false;
      }

      return typeof (value as { theme?: unknown }).theme === 'string';
    };

    const { result } = renderHook(() =>
      usePersistedState('persisted-key', { theme: 'light' }, isTheme),
    );

    expect(result.current[0]).toEqual({ theme: 'light' });
    expect(mockErrorLog).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse persisted state for key "%s" with validator.'),
      'persisted-key',
      'invalid_shape',
    );
  });
});

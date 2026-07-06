import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useErrorHandling } from '../useErrorHandling';

describe('useErrorHandling', () => {
  it('starts with no errors', () => {
    const { result } = renderHook(() => useErrorHandling());

    expect(result.current.failedMatches).toEqual([]);
    expect(result.current.errorMessages).toEqual({});
  });

  it('addError records failures and deduplicates repeated match ids', () => {
    const { result } = renderHook(() => useErrorHandling());

    act(() => {
      result.current.addError('m1', 'first error');
    });
    act(() => {
      result.current.addError('m2', 'second error');
    });
    act(() => {
      result.current.addError('m1', 'updated error');
    });

    // m1 appears only once despite two addError calls
    expect(result.current.failedMatches).toEqual(['m1', 'm2']);
    // The message for m1 is the latest one
    expect(result.current.errorMessages).toEqual({
      m1: 'updated error',
      m2: 'second error',
    });
  });

  it('clearErrors(matchId) removes only that match', () => {
    const { result } = renderHook(() => useErrorHandling());

    act(() => {
      result.current.addError('m1', 'first error');
    });
    act(() => {
      result.current.addError('m2', 'second error');
    });

    act(() => {
      result.current.clearErrors('m1');
    });

    expect(result.current.failedMatches).toEqual(['m2']);
    expect(result.current.errorMessages).toEqual({ m2: 'second error' });
  });

  it('clearErrors() removes everything', () => {
    const { result } = renderHook(() => useErrorHandling());

    act(() => {
      result.current.addError('m1', 'first error');
    });

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.failedMatches).toEqual([]);
    expect(result.current.errorMessages).toEqual({});
  });

  it('exposes raw setters for direct state control', () => {
    const { result } = renderHook(() => useErrorHandling());

    act(() => {
      result.current.setFailedMatches(['m9']);
      result.current.setErrorMessages({ m9: 'direct' });
    });

    expect(result.current.failedMatches).toEqual(['m9']);
    expect(result.current.errorMessages).toEqual({ m9: 'direct' });
  });
});

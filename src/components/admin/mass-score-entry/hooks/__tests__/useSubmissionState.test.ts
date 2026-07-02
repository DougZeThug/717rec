import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockToast = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { useSubmissionState } from '../useSubmissionState';

describe('useSubmissionState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with a clean submission state and exposes the toast function', () => {
    const { result } = renderHook(() => useSubmissionState());

    expect(result.current.submitting).toBe(false);
    expect(result.current.failedMatches).toEqual([]);
    expect(result.current.errorMessages).toEqual({});
    expect(result.current.toast).toBe(mockToast);
  });

  it('tracks submitting state', () => {
    const { result } = renderHook(() => useSubmissionState());

    act(() => {
      result.current.setSubmitting(true);
    });
    expect(result.current.submitting).toBe(true);

    act(() => {
      result.current.setSubmitting(false);
    });
    expect(result.current.submitting).toBe(false);
  });

  it('addError records the failed match id and message', () => {
    const { result } = renderHook(() => useSubmissionState());

    act(() => {
      result.current.addError('m1', 'first error');
    });
    act(() => {
      result.current.addError('m2', 'second error');
    });

    expect(result.current.failedMatches).toEqual(['m1', 'm2']);
    expect(result.current.errorMessages).toEqual({
      m1: 'first error',
      m2: 'second error',
    });
  });

  it('clearErrors(matchId) clears only that match', () => {
    const { result } = renderHook(() => useSubmissionState());

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

  it('clearErrors() with no argument clears everything', () => {
    const { result } = renderHook(() => useSubmissionState());

    act(() => {
      result.current.addError('m1', 'first error');
    });
    act(() => {
      result.current.addError('m2', 'second error');
    });

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.failedMatches).toEqual([]);
    expect(result.current.errorMessages).toEqual({});
  });
});

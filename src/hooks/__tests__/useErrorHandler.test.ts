import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useErrorHandler } from '../useErrorHandler';

const mockToast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { ValidationError } from '@/types/errors';
import type { HookErrorResult } from '@/utils/errorHandler';

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handleError returns a HookErrorResult for a plain Error', () => {
    const { result } = renderHook(() => useErrorHandler());

    let info: HookErrorResult | undefined;
    act(() => {
      info = result.current.handleError(new Error('boom'), 'Fetching data');
    });

    expect(info).toBeDefined();
    // The original error message is passed through on `message`.
    expect(info?.message).toBe('boom');
    // A plain Error matches no special branch, so the default user message is used.
    expect(info?.userMessage).toBe('An unexpected error occurred. Please try again.');
    expect(typeof info?.userMessage).toBe('string');
    expect((info?.userMessage ?? '').length).toBeGreaterThan(0);
    expect(info?.category).toBe('unknown');
  });

  it('handleError passes the message through for a ValidationError', () => {
    const { result } = renderHook(() => useErrorHandler());

    let info: HookErrorResult | undefined;
    act(() => {
      info = result.current.handleError(new ValidationError('Name is required'), 'Saving form');
    });

    expect(info?.message).toBe('Name is required');
    expect(info?.userMessage).toBe('Name is required');
    expect(info?.category).toBe('validation');
  });

  it('handleError shows a destructive toast by default', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error('boom'), 'Fetching data');
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Fetching data failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    );
  });

  it('handleError does NOT toast when showToast is false', () => {
    const { result } = renderHook(() => useErrorHandler());

    mockToast.mockClear();
    let info: HookErrorResult | undefined;
    act(() => {
      info = result.current.handleError(new Error('boom'), 'X', false);
    });

    expect(mockToast).not.toHaveBeenCalled();
    expect(info?.userMessage.length).toBeGreaterThan(0);
  });

  it('handleErrorSilent does NOT toast but still returns a userMessage', () => {
    const { result } = renderHook(() => useErrorHandler());

    mockToast.mockClear();
    let info: HookErrorResult | undefined;
    act(() => {
      info = result.current.handleErrorSilent(new Error('boom'), 'Y');
    });

    expect(mockToast).not.toHaveBeenCalled();
    expect(info).toBeDefined();
    expect(typeof info?.userMessage).toBe('string');
    expect((info?.userMessage ?? '').length).toBeGreaterThan(0);
  });
});

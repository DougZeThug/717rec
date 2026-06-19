import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useLazyRef } from '@/hooks/useLazyRef';

describe('useLazyRef', () => {
  it('exposes the value produced by the initializer', () => {
    const { result } = renderHook(() => useLazyRef(() => new Map<string, number>()));

    expect(result.current.current).toBeInstanceOf(Map);
    expect(result.current.current.size).toBe(0);
  });

  it('runs the initializer only once across re-renders', () => {
    const init = vi.fn(() => new Set<string>());
    const { result, rerender } = renderHook(() => useLazyRef(init));

    const first = result.current.current;
    rerender();
    rerender();

    expect(init).toHaveBeenCalledTimes(1);
    // Same object identity is preserved across renders.
    expect(result.current.current).toBe(first);
  });

  it('runs exactly once even when the initializer returns null', () => {
    const init = vi.fn<[], null>(() => null);
    const { result, rerender } = renderHook(() => useLazyRef(init));

    expect(result.current.current).toBeNull();
    rerender();
    rerender();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('keeps mutations made through the ref', () => {
    const { result } = renderHook(() => useLazyRef(() => new Map<string, number>()));

    result.current.current.set('a', 1);

    expect(result.current.current.get('a')).toBe(1);
  });
});

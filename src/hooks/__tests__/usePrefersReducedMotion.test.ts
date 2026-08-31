import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePrefersReducedMotion, useScrollBehavior } from '../usePrefersReducedMotion';

let changeHandler: ((e: { matches: boolean }) => void) | null = null;
let lastQuery = '';

const installMatchMedia = (matches: boolean) => {
  changeHandler = null;
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    lastQuery = query;
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: (_event: string, cb: (e: { matches: boolean }) => void) => {
        changeHandler = cb;
      },
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }) as unknown as typeof window.matchMedia;
};

const originalMatchMedia = window.matchMedia;

describe('usePrefersReducedMotion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('asks the browser for the reduce-motion preference', () => {
    installMatchMedia(false);
    renderHook(() => usePrefersReducedMotion());

    expect(lastQuery).toBe('(prefers-reduced-motion: reduce)');
  });

  it('returns false when the user has not asked to reduce motion', () => {
    installMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
  });

  it('returns true when the user has asked to reduce motion', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
  });

  it('follows the setting when it changes', () => {
    installMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);

    act(() => changeHandler?.({ matches: true }));
    expect(result.current).toBe(true);
  });

  it('returns false when matchMedia is unavailable', () => {
    // @ts-expect-error deliberately removing the API to test the guard
    window.matchMedia = undefined;
    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
  });
});

describe('useScrollBehavior', () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('scrolls smoothly by default', () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useScrollBehavior());

    expect(result.current).toBe('smooth');
  });

  it('jumps instead of scrolling when motion is reduced', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useScrollBehavior());

    expect(result.current).toBe('auto');
  });
});

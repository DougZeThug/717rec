import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMobile } from '../useMobile';

let changeHandler: ((e: { matches: boolean }) => void) | null = null;

const installMatchMedia = (matches: boolean) => {
  changeHandler = null;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
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
  })) as unknown as typeof window.matchMedia;
};

const originalMatchMedia = window.matchMedia;

describe('useMobile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns false when matchMedia matches is false', () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);
  });

  it('returns true when matchMedia matches is true', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(true);
  });

  it('updates to true when a change event fires', () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);

    // Prove the hook actually registered a change listener (the path under test);
    // otherwise the optional-chained call below would silently no-op.
    expect(changeHandler).not.toBeNull();

    act(() => {
      changeHandler?.({ matches: true });
    });
    expect(result.current).toBe(true);
  });
});

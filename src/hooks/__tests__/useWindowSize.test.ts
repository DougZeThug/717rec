import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWindowSize } from '../useWindowSize';

const setSize = (w: number, h: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: w });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: h });
};

describe('useWindowSize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    setSize(1024, 768);
  });

  it('returns current window size after mount', async () => {
    setSize(1024, 768);
    const { result } = renderHook(() => useWindowSize());
    await waitFor(() => expect(result.current).toEqual([1024, 768]));
  });

  it('updates on resize', async () => {
    setSize(1024, 768);
    const { result } = renderHook(() => useWindowSize());
    await waitFor(() => expect(result.current).toEqual([1024, 768]));

    setSize(500, 400);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toEqual([500, 400]);
  });

  it('removes the resize listener on unmount', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    setSize(1024, 768);
    const { result, unmount } = renderHook(() => useWindowSize());
    await waitFor(() => expect(result.current).toEqual([1024, 768]));

    // The exact handler the hook registered for 'resize'.
    const resizeCall = addSpy.mock.calls.find(([event]) => event === 'resize');
    if (!resizeCall) throw new Error('expected a resize listener to be registered');
    const handler = resizeCall[1];

    unmount();

    // The same handler reference must be removed; otherwise the hook leaks a
    // listener that calls setState on an unmounted component on later resizes.
    expect(removeSpy).toHaveBeenCalledWith('resize', handler);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

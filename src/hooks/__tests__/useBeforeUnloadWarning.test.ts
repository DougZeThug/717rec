import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useBeforeUnloadWarning } from '@/hooks/useBeforeUnloadWarning';

/** What a reload or a closed tab sends the page. */
const dispatchBeforeUnload = (): Event => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
};

describe('useBeforeUnloadWarning', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('asks the browser to warn while active', () => {
    renderHook(() => useBeforeUnloadWarning(true));

    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
  });

  it('lets the browser leave while inactive', () => {
    renderHook(() => useBeforeUnloadWarning(false));

    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });

  it('removes its listener once it goes inactive', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { rerender } = renderHook(({ active }) => useBeforeUnloadWarning(active), {
      initialProps: { active: true },
    });

    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);

    rerender({ active: false });

    expect(removeSpy.mock.calls.some((call) => call[0] === 'beforeunload')).toBe(true);
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });

  it('removes its listener on unmount', () => {
    const { unmount } = renderHook(() => useBeforeUnloadWarning(true));

    unmount();

    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });
});

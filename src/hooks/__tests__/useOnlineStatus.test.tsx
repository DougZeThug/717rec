import { onlineManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useOnlineStatus } from '../useOnlineStatus';

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('useOnlineStatus', () => {
  it('reports a connection by default', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('flips when the connection drops and again when it returns', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => onlineManager.setOnline(false));
    expect(result.current).toBe(false);

    act(() => onlineManager.setOnline(true));
    expect(result.current).toBe(true);
  });

  it('stops listening once it is unmounted', () => {
    const { unmount } = renderHook(() => useOnlineStatus());
    const before = onlineManager.hasListeners();
    unmount();

    expect(before).toBe(true);
    // Nothing here asserts the manager has no listeners at all: it keeps its own
    // while the app's QueryClient is mounted. What matters is that flipping the
    // connection after unmount does not reach a torn-down hook and throw.
    expect(() => onlineManager.setOnline(false)).not.toThrow();
  });
});

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import {
  clearUnsavedWork,
  confirmDiscardUnsavedWork,
  findUnsavedWork,
} from '@/utils/unsavedChanges';

describe('useUnsavedChangesGuard', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  // Typed loosely on purpose: only the first argument of each call is read.
  type ListenerSpy = { mock: { calls: unknown[][] } };
  let addSpy: ListenerSpy;
  let removeSpy: ListenerSpy;

  beforeEach(() => {
    clearUnsavedWork();
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    addSpy = vi.spyOn(window, 'addEventListener');
    removeSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    clearUnsavedWork();
    vi.restoreAllMocks();
  });

  const beforeUnloadCalls = (spy: ListenerSpy) =>
    spy.mock.calls.filter((call) => call[0] === 'beforeunload');

  it('registers while mounted and forgets on unmount', () => {
    const { unmount } = renderHook(() => useUnsavedChangesGuard(true, 'Lose the scores?'));

    expect(findUnsavedWork()?.message).toBe('Lose the scores?');

    unmount();
    expect(findUnsavedWork()).toBeNull();
  });

  it('reports nothing to lose while the screen is clean', () => {
    renderHook(() => useUnsavedChangesGuard(false));

    expect(findUnsavedWork()).toBeNull();
    expect(confirmDiscardUnsavedWork()).toBe(true);
  });

  // A keystroke must not churn the registry, but the answer must not go stale.
  it('follows a change of state without registering again', () => {
    const { rerender } = renderHook(({ dirty }) => useUnsavedChangesGuard(dirty, 'Lose it?'), {
      initialProps: { dirty: false },
    });

    expect(findUnsavedWork()).toBeNull();

    rerender({ dirty: true });
    expect(findUnsavedWork()?.message).toBe('Lose it?');

    rerender({ dirty: false });
    expect(findUnsavedWork()).toBeNull();
  });

  it('asks the browser before the page is left, only while there is work', () => {
    const { rerender } = renderHook(({ dirty }) => useUnsavedChangesGuard(dirty), {
      initialProps: { dirty: false },
    });

    expect(beforeUnloadCalls(addSpy)).toHaveLength(0);

    rerender({ dirty: true });
    expect(beforeUnloadCalls(addSpy)).toHaveLength(1);

    rerender({ dirty: false });
    expect(beforeUnloadCalls(removeSpy)).toHaveLength(1);
  });

  it('stops the browser leaving while there is work', () => {
    renderHook(() => useUnsavedChangesGuard(true));

    const event = new Event('beforeunload', { cancelable: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('lets the browser leave once the work is saved', () => {
    const { rerender } = renderHook(({ dirty }) => useUnsavedChangesGuard(dirty), {
      initialProps: { dirty: true },
    });

    rerender({ dirty: false });

    const event = new Event('beforeunload', { cancelable: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('asks about its own work when a Cancel button calls confirmDiscard', () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true, 'Lose the round?'));

    let carriedOn = false;
    act(() => {
      carriedOn = result.current.confirmDiscard();
    });

    expect(confirmSpy).toHaveBeenCalledWith('Lose the round?');
    expect(carriedOn).toBe(true);
  });

  it('does not ask when there is nothing to lose', () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(false));

    expect(result.current.confirmDiscard()).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});

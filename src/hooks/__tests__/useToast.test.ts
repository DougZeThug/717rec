import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toast, useToast } from '@/hooks/useToast';

/**
 * TOAST_LIMIT and TOAST_REMOVE_DELAY are coupled: Radix only flips a toast to
 * `open: false` when it auto-closes, so a long remove delay leaves invisible
 * toasts holding slots that visible ones need. These tests pin that pairing.
 */
describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Toast state lives in a module-level store shared by every consumer, so
    // clear it between tests or toasts leak from one case into the next.
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss();
      vi.runAllTimers();
    });
    vi.useRealTimers();
  });

  it('shows three toasts at once instead of replacing the previous one', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'first' });
      toast({ title: 'second' });
      toast({ title: 'third' });
    });

    expect(result.current.toasts.map((t) => t.title)).toEqual(['third', 'second', 'first']);
  });

  it('drops the oldest toast when a fourth arrives', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'first' });
      toast({ title: 'second' });
      toast({ title: 'third' });
      toast({ title: 'fourth' });
    });

    expect(result.current.toasts.map((t) => t.title)).toEqual(['fourth', 'third', 'second']);
    expect(result.current.toasts).toHaveLength(3);
  });

  it('closes a dismissed toast immediately and removes it shortly after', () => {
    const { result } = renderHook(() => useToast());

    let handle: { dismiss: () => void };
    act(() => {
      handle = toast({ title: 'closing' });
    });

    act(() => {
      handle.dismiss();
    });

    // Still present, but closed — this is the window the exit animation needs.
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].open).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('does not let dismissed toasts occupy slots that new toasts need', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'old-a' });
      toast({ title: 'old-b' });
      toast({ title: 'old-c' });
    });

    act(() => {
      result.current.dismiss();
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.toasts).toHaveLength(0);

    act(() => {
      toast({ title: 'new' });
    });

    expect(result.current.toasts.map((t) => t.title)).toEqual(['new']);
  });
});

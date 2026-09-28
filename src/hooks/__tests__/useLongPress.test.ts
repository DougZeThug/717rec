import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLongPress } from '../useLongPress';

const target = {} as EventTarget;

const touchEvent = (x: number, y: number) =>
  ({ target, touches: [{ clientX: x, clientY: y }] }) as unknown as React.TouchEvent;

const touchEndEvent = () => ({ target, touches: [] }) as unknown as React.TouchEvent;

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires onLongPress when a finger holds still past the delay', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => result.current.onTouchStart(touchEvent(100, 100)));
    act(() => vi.advanceTimersByTime(500));

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('still fires when the finger only jitters a few px', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => result.current.onTouchStart(touchEvent(100, 100)));
    act(() => result.current.onTouchMove(touchEvent(104, 103)));
    act(() => vi.advanceTimersByTime(500));

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  // A slow drag-pan of the feed lasts over 500 ms with the finger still down.
  // It is a scroll, so the reaction picker must not open mid-gesture.
  it('does not fire when the finger drags away to scroll', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress, onClick }));

    act(() => result.current.onTouchStart(touchEvent(100, 100)));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current.onTouchMove(touchEvent(100, 140)));
    act(() => vi.advanceTimersByTime(500));
    act(() => result.current.onTouchEnd(touchEndEvent()));

    expect(onLongPress).not.toHaveBeenCalled();
    // A scroll is not a tap either.
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not fire when the browser cancels the touch', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => result.current.onTouchStart(touchEvent(100, 100)));
    act(() => result.current.onTouchCancel());
    act(() => vi.advanceTimersByTime(500));

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('calls onClick for a short tap', () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress, onClick }));

    act(() => result.current.onTouchStart(touchEvent(100, 100)));
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current.onTouchEnd(touchEndEvent()));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });
});

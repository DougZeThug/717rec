import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getStartCountdown, useStartCountdown } from '../useStartCountdown';

const NOW = new Date('2026-01-15T12:00:00Z');
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const startIn = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);

describe('getStartCountdown', () => {
  it('shows hours and minutes when the start is an hour or more away', () => {
    const result = getStartCountdown(startIn(5 * HOUR + 30 * MINUTE), NOW);

    expect(result.text).toBe('5h 30m until start');
    // 100 - (5.5h / 12h) * 100
    expect(result.percent).toBeCloseTo(54.1667, 3);
  });

  it('shows only minutes in the last hour', () => {
    const result = getStartCountdown(startIn(45 * MINUTE), NOW);

    expect(result.text).toBe('45m until start');
    expect(result.percent).toBeCloseTo(93.75, 3);
  });

  it('shows 1h 0m at exactly one hour', () => {
    expect(getStartCountdown(startIn(HOUR), NOW).text).toBe('1h 0m until start');
  });

  it('says Starting now! in the last minute', () => {
    expect(getStartCountdown(startIn(59 * 1000), NOW)).toEqual({
      text: 'Starting now!',
      percent: 100,
    });
  });

  it('says Event started! at the start time and after it', () => {
    expect(getStartCountdown(startIn(0), NOW)).toEqual({ text: 'Event started!', percent: 100 });
    expect(getStartCountdown(startIn(-HOUR), NOW)).toEqual({
      text: 'Event started!',
      percent: 100,
    });
  });

  it('keeps progress at 0 when the start is more than 12 hours away', () => {
    const result = getStartCountdown(startIn(30 * HOUR), NOW);

    expect(result.text).toBe('30h 0m until start');
    expect(result.percent).toBe(0);
  });
});

describe('useStartCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts empty and stays idle without a start time', () => {
    const { result } = renderHook(() => useStartCountdown(undefined));

    expect(result.current).toEqual({ text: '', percent: 0 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows the countdown right away', () => {
    const { result } = renderHook(() => useStartCountdown(startIn(2 * HOUR).toISOString()));

    expect(result.current.text).toBe('2h 0m until start');
  });

  it('updates once a minute', () => {
    const { result } = renderHook(() => useStartCountdown(startIn(2 * HOUR).toISOString()));

    act(() => {
      vi.advanceTimersByTime(59 * 1000);
    });
    expect(result.current.text).toBe('2h 0m until start');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.text).toBe('1h 59m until start');
  });

  it('restarts when the start time changes', () => {
    const { result, rerender } = renderHook(({ start }) => useStartCountdown(start), {
      initialProps: { start: startIn(2 * HOUR).toISOString() },
    });

    rerender({ start: startIn(30 * MINUTE).toISOString() });

    expect(result.current.text).toBe('30m until start');
  });

  it('stops the timer on unmount', () => {
    const { unmount } = renderHook(() => useStartCountdown(startIn(HOUR).toISOString()));
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

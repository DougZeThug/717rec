import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runAfterDelayWhenIdle } from '../deferWork';

describe('runAfterDelayWhenIdle', () => {
  const originalRequestIdleCallback = globalThis.requestIdleCallback;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.requestIdleCallback = originalRequestIdleCallback;
  });

  it('waits the full delay before asking for idle time', () => {
    const idle = vi.fn((cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 0 });
      return 1;
    });
    vi.stubGlobal('requestIdleCallback', idle);
    const work = vi.fn();

    runAfterDelayWhenIdle(work, 12000);

    // requestIdleCallback's own timeout is a deadline, not a delay, so the wait
    // has to come first or the work lands at the next idle gap instead.
    vi.advanceTimersByTime(11999);
    expect(idle).not.toHaveBeenCalled();
    expect(work).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(idle).toHaveBeenCalledTimes(1);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('passes the idle deadline through so the work cannot be postponed forever', () => {
    const idle = vi.fn(() => 1);
    vi.stubGlobal('requestIdleCallback', idle);

    runAfterDelayWhenIdle(vi.fn(), 1000, 500);
    vi.advanceTimersByTime(1000);

    expect(idle).toHaveBeenCalledWith(expect.any(Function), { timeout: 500 });
  });

  it('runs the work straight after the delay without requestIdleCallback', () => {
    Reflect.deleteProperty(globalThis, 'requestIdleCallback');
    Reflect.deleteProperty(window, 'requestIdleCallback');
    const work = vi.fn();

    runAfterDelayWhenIdle(work, 12000);

    vi.advanceTimersByTime(11999);
    expect(work).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(work).toHaveBeenCalledTimes(1);
  });
});

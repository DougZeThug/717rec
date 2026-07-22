import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetBracketRealtimeCoalescerForTests,
  scheduleBracketRefresh,
} from '../bracketRealtimeCoalescer';

const makeHandler = () => ({ invalidate: vi.fn(), notify: vi.fn() });

describe('bracketRealtimeCoalescer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetBracketRealtimeCoalescerForTests();
  });

  afterEach(() => {
    __resetBracketRealtimeCoalescerForTests();
    vi.useRealTimers();
  });

  it('coalesces a burst of events into a single flush', () => {
    const handler = makeHandler();

    for (let i = 0; i < 10; i++) {
      scheduleBracketRefresh('b1:1', handler);
      vi.advanceTimersByTime(100); // events arrive faster than the debounce
    }
    expect(handler.invalidate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);

    expect(handler.invalidate).toHaveBeenCalledTimes(1);
    expect(handler.notify).toHaveBeenCalledTimes(1);
  });

  it('keeps different brackets independent', () => {
    const handlerA = makeHandler();
    const handlerB = makeHandler();

    scheduleBracketRefresh('a:1', handlerA);
    scheduleBracketRefresh('b:2', handlerB);
    vi.advanceTimersByTime(1500);

    expect(handlerA.invalidate).toHaveBeenCalledTimes(1);
    expect(handlerB.invalidate).toHaveBeenCalledTimes(1);
  });

  it('the last-registered handler wins when several instances watch one bracket', () => {
    const first = makeHandler();
    const second = makeHandler();

    scheduleBracketRefresh('b1:1', first);
    scheduleBracketRefresh('b1:1', second);
    vi.advanceTimersByTime(1500);

    expect(first.invalidate).not.toHaveBeenCalled();
    expect(second.invalidate).toHaveBeenCalledTimes(1);
    expect(second.notify).toHaveBeenCalledTimes(1);
  });

  it('applies the notification floor: rapid consecutive saves refresh data but notify once', () => {
    const handler = makeHandler();

    scheduleBracketRefresh('b1:1', handler);
    vi.advanceTimersByTime(1500); // first flush: invalidate + notify

    scheduleBracketRefresh('b1:1', handler);
    vi.advanceTimersByTime(1500); // second flush 3s after the first: within the 5s floor

    expect(handler.invalidate).toHaveBeenCalledTimes(2);
    expect(handler.notify).toHaveBeenCalledTimes(1);

    // Once the floor elapses, the next flush notifies again.
    vi.advanceTimersByTime(5000);
    scheduleBracketRefresh('b1:1', handler);
    vi.advanceTimersByTime(1500);

    expect(handler.invalidate).toHaveBeenCalledTimes(3);
    expect(handler.notify).toHaveBeenCalledTimes(2);
  });

  it('reset clears pending timers', () => {
    const handler = makeHandler();
    scheduleBracketRefresh('b1:1', handler);

    __resetBracketRealtimeCoalescerForTests();
    vi.advanceTimersByTime(5000);

    expect(handler.invalidate).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetRealtimeAuthGate, publishRealtimeToken } from '@/hooks/realtime/realtimeAuthGate';
import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';

const statusCallbacks: ((status: string) => void)[] = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/services/auth/AuthService', () => ({
  setRealtimeAuth: vi.fn(),
}));

const buildChannel = () => {
  const channel = {
    subscribe: (cb: (status: string) => void) => {
      statusCallbacks.push(cb);
      return channel;
    },
  };
  // The helper only needs subscribe(); the real RealtimeChannel type is wider.
  return channel as never;
};

/** Drive the newest channel to failure and run the backoff timer. */
const failOnce = () => {
  statusCallbacks[statusCallbacks.length - 1]?.('CHANNEL_ERROR');
  vi.runOnlyPendingTimers();
};

describe('subscribeWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    statusCallbacks.length = 0;
    __resetRealtimeAuthGate();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pauses after the attempt cap and resumes on a new token', () => {
    const build = vi.fn(buildChannel);
    const { dispose } = subscribeWithRetry({ label: 'test', build });

    expect(build).toHaveBeenCalledTimes(1);

    // Six failures consume the cap; the seventh parks the channel.
    for (let i = 0; i < 7; i += 1) failOnce();
    expect(build).toHaveBeenCalledTimes(7);

    // A fresh access token wakes a parked channel.
    publishRealtimeToken('new-token');
    vi.advanceTimersByTime(60_000);
    expect(build).toHaveBeenCalledTimes(8);

    dispose();
  });

  it('resumes a parked channel on its own after the backstop delay', () => {
    const build = vi.fn(buildChannel);
    const { dispose } = subscribeWithRetry({ label: 'test', build });

    for (let i = 0; i < 7; i += 1) failOnce();
    expect(build).toHaveBeenCalledTimes(7);

    // No token change at all (signed-out visitor): the periodic retry must
    // still bring live updates back without a page reload.
    vi.advanceTimersByTime(60_000);
    vi.runOnlyPendingTimers();
    expect(build).toHaveBeenCalledTimes(8);

    dispose();
  });

  it('resumes a parked channel when the browser comes back online', () => {
    const build = vi.fn(buildChannel);
    const { dispose } = subscribeWithRetry({ label: 'test', build });

    for (let i = 0; i < 7; i += 1) failOnce();
    window.dispatchEvent(new Event('online'));
    vi.runOnlyPendingTimers();
    expect(build).toHaveBeenCalledTimes(8);

    dispose();
  });

  it('ignores token changes and wake events after dispose', () => {
    const build = vi.fn(buildChannel);
    const { dispose } = subscribeWithRetry({ label: 'test', build });

    for (let i = 0; i < 7; i += 1) failOnce();
    dispose();

    publishRealtimeToken('another-token');
    window.dispatchEvent(new Event('online'));
    vi.advanceTimersByTime(120_000);
    expect(build).toHaveBeenCalledTimes(7);
  });
});

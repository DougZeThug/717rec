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

  it('stops retrying after the attempt cap and resumes on a new token', () => {
    const build = vi.fn(buildChannel);
    const { dispose } = subscribeWithRetry({ label: 'test', build });

    expect(build).toHaveBeenCalledTimes(1);

    // Six failures consume the cap; the seventh failure must not rebuild.
    for (let i = 0; i < 7; i += 1) failOnce();
    expect(build).toHaveBeenCalledTimes(7);

    failOnce();
    expect(build).toHaveBeenCalledTimes(7);

    // A fresh access token is the only thing that wakes a parked channel.
    publishRealtimeToken('new-token');
    vi.runOnlyPendingTimers();
    expect(build).toHaveBeenCalledTimes(8);

    dispose();
  });

  it('ignores token changes after dispose', () => {
    const build = vi.fn(buildChannel);
    const { dispose } = subscribeWithRetry({ label: 'test', build });

    for (let i = 0; i < 7; i += 1) failOnce();
    dispose();

    publishRealtimeToken('another-token');
    vi.runOnlyPendingTimers();
    expect(build).toHaveBeenCalledTimes(7);
  });
});

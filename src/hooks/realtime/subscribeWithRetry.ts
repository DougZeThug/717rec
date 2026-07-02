import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import { errorLog, log } from '@/utils/logger';

export interface SubscribeWithRetryOptions {
  /** Human-readable label used in logs (e.g. hook name). */
  label: string;
  /**
   * Factory that builds a fresh channel with all `.on(...)` handlers attached
   * (but WITHOUT calling `.subscribe()`). Called on every (re)connect attempt.
   * Phoenix channels can only be joined once, so retries need a new instance.
   */
  build: () => RealtimeChannel;
  /**
   * Called every time the channel reaches SUBSCRIBED. Use to invalidate
   * queries or refetch data so state resyncs after a drop.
   */
  onReconnect?: (isFirstConnect: boolean) => void;
  /** Called when the channel status changes. Useful for UI indicators. */
  onStatus?: (status: string) => void;
}

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

/**
 * Subscribe to a Supabase realtime channel with automatic error/reconnect
 * handling. Returns a `dispose()` function to call from your effect cleanup.
 *
 * Handles CHANNEL_ERROR, TIMED_OUT, and CLOSED by tearing down the failed
 * channel and rebuilding it with exponential backoff (1s → 30s, jittered).
 */
export function subscribeWithRetry(options: SubscribeWithRetryOptions): { dispose: () => void } {
  const { label, build, onReconnect, onStatus } = options;

  let currentChannel: RealtimeChannel | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let hasConnectedOnce = false;
  let disposed = false;

  const connect = (): void => {
    if (disposed) return;

    const channel = build();
    currentChannel = channel;

    channel.subscribe((status) => {
      if (disposed) return;
      onStatus?.(status);

      if (status === 'SUBSCRIBED') {
        const isFirst = !hasConnectedOnce;
        hasConnectedOnce = true;
        attempt = 0;
        if (!isFirst) {
          log(`[realtime:${label}] reconnected`);
        }
        try {
          onReconnect?.(isFirst);
        } catch (err) {
          errorLog(`[realtime:${label}] onReconnect handler threw`, err);
        }
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        errorLog(`[realtime:${label}] channel ${status} — scheduling reconnect`);
        scheduleReconnect();
      }
    });
  };

  const scheduleReconnect = (): void => {
    if (disposed || retryTimer) return;

    const exp = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempt);
    const jitter = Math.random() * 0.3 * exp;
    const delay = Math.round(exp + jitter);
    attempt += 1;

    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (disposed) return;
      const stale = currentChannel;
      currentChannel = null;
      if (stale) {
        // Fire-and-forget; removeChannel returns a promise but we don't await
        void supabase.removeChannel(stale);
      }
      connect();
    }, delay);
  };

  connect();

  return {
    dispose: () => {
      disposed = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (currentChannel) {
        void supabase.removeChannel(currentChannel);
        currentChannel = null;
      }
    },
  };
}

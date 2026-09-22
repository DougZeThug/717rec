import type { RealtimeChannel } from '@supabase/supabase-js';

import {
  getRealtimeTokenVersion,
  hasRealtimeToken,
  onRealtimeTokenChange,
} from '@/hooks/realtime/realtimeAuthGate';
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
 * How many failed attempts in a row are allowed before the channel parks.
 * Six attempts span roughly a minute of backoff, which comfortably covers a
 * Supabase realtime restart. Anything beyond that is usually a bad token, and
 * retrying forever is what filled the logs with `MalformedJWT` every few
 * seconds.
 */
const MAX_ATTEMPTS = 6;
/**
 * How long a parked channel waits before trying again on its own. Network
 * recovery usually arrives sooner through the `online`/visibility signals; this
 * is the backstop so a park can never be permanent.
 */
const PARKED_RETRY_MS = 60_000;

/**
 * Subscribe to a Supabase realtime channel with automatic error/reconnect
 * handling. Returns a `dispose()` function to call from your effect cleanup.
 *
 * Handles CHANNEL_ERROR, TIMED_OUT, and CLOSED by tearing down the failed
 * channel and rebuilding it with exponential backoff (1s → 30s, jittered).
 * After MAX_ATTEMPTS consecutive failures the channel parks and only
 * reconnects when a new access token is published.
 */
export function subscribeWithRetry(options: SubscribeWithRetryOptions): { dispose: () => void } {
  const { label, build, onReconnect, onStatus } = options;

  let currentChannel: RealtimeChannel | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let parkedTimer: ReturnType<typeof setInterval> | null = null;
  let attempt = 0;
  let hasConnectedOnce = false;
  let disposed = false;
  let parkedAtTokenVersion: number | null = null;

  /**
   * Leave the parked state and try again. A park must never be permanent: a
   * phone losing signal or a backgrounded tab looks exactly like a bad token,
   * and a spectator would be left on a frozen scoreboard until they reloaded.
   */
  function unpark(reason: string): void {
    if (disposed || parkedAtTokenVersion === null) return;
    log(`[realtime:${label}] ${reason} — resuming`);
    parkedAtTokenVersion = null;
    attempt = 0;
    stopParkedWatch();
    scheduleReconnect();
  }

  // Woken by a token change while parked: a fresh token is the one thing that
  // can turn a rejected join into a working one.
  const unsubscribeToken = onRealtimeTokenChange(() => {
    if (parkedAtTokenVersion === null) return;
    if (getRealtimeTokenVersion() === parkedAtTokenVersion) return;
    unpark('new access token');
  });

  // Signed-out visitors never get a token change, so a park also ends on the
  // signals that mark a likely-recovered network, plus a slow safety retry.
  const onOnline = () => unpark('browser back online');
  const onVisible = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      unpark('tab visible again');
    }
  };

  function startParkedWatch(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline);
      window.addEventListener('focus', onVisible);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }
    parkedTimer = setInterval(() => unpark('periodic retry'), PARKED_RETRY_MS);
  }

  function stopParkedWatch(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onVisible);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisible);
    }
    if (parkedTimer) {
      clearInterval(parkedTimer);
      parkedTimer = null;
    }
  }

  // connect() and scheduleReconnect() call each other, so these are
  // declarations rather than arrow consts: hoisting lets either one come
  // first without a forward reference.
  function connect(): void {
    if (disposed) return;

    const channel = build();
    currentChannel = channel;

    channel.subscribe((status) => {
      if (disposed) return;
      // Ignore events from a stale channel that is being cleaned up (e.g.
      // removeChannel() can synchronously emit CLOSED before the binding is
      // removed). Without this guard, cleanup-triggered CLOSED would schedule
      // another reconnect and create a loop.
      if (channel !== currentChannel) return;
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
        // Record whether a token was available, so a repeat failure can be told
        // apart from a plain outage when reading the logs.
        errorLog(`[realtime:${label}] channel ${status} — attempt ${attempt + 1}/${MAX_ATTEMPTS}`, {
          hasToken: hasRealtimeToken(),
        });
        scheduleReconnect();
      }
    });
  }

  function scheduleReconnect(): void {
    if (disposed || retryTimer || parkedAtTokenVersion !== null) return;

    if (attempt >= MAX_ATTEMPTS) {
      // Park instead of hammering the server. onRealtimeTokenChange above
      // resumes as soon as a new access token arrives.
      parkedAtTokenVersion = getRealtimeTokenVersion();
      errorLog(`[realtime:${label}] gave up after ${MAX_ATTEMPTS} attempts — waiting for a token`);
      const stale = currentChannel;
      currentChannel = null;
      if (stale) void supabase.removeChannel(stale);
      return;
    }

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
  }

  connect();

  return {
    dispose: () => {
      disposed = true;
      unsubscribeToken();
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

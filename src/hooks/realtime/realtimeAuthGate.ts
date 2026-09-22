import { setRealtimeAuth } from '@/services/auth/AuthService';
import { authLog } from '@/utils/logger';

/**
 * Single place that owns the token the realtime socket authenticates with.
 *
 * Two problems this solves:
 *
 * 1. The client was created without ever pushing a refreshed access token into
 *    the realtime socket. Once a token expired or was cleared, every channel
 *    kept joining with the stale value and Supabase answered `MalformedJWT`.
 * 2. `subscribeWithRetry` backed off forever on those failures, so a browser
 *    with a bad token retried every few seconds for as long as the tab was
 *    open. Channels now park after a few attempts and wait here for a new
 *    token instead.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

let currentToken: string | null = null;
let tokenVersion = 0;

/** True when a token is currently available for realtime joins. */
export const hasRealtimeToken = (): boolean => currentToken !== null;

/**
 * Increments on every token change. A parked channel compares the version it
 * last failed on, so it only reconnects for a genuinely new token.
 */
export const getRealtimeTokenVersion = (): number => tokenVersion;

/**
 * Push the signed-in user's access token (or `null` on sign-out) into the
 * realtime socket and wake any channel parked on an auth failure.
 */
export const publishRealtimeToken = (token: string | null): void => {
  if (token === currentToken) return;

  currentToken = token;
  tokenVersion += 1;
  authLog('[realtime] token updated for realtime socket', {
    hasToken: token !== null,
    version: tokenVersion,
  });

  setRealtimeAuth(token);

  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // A misbehaving listener must not stop the others from waking.
    }
  }
};

/** Subscribe to token changes. Returns an unsubscribe function. */
export const onRealtimeTokenChange = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Test helper: clear the module state between cases. */
export const __resetRealtimeAuthGate = (): void => {
  listeners.clear();
  currentToken = null;
  tokenVersion = 0;
};

/**
 * Coalesces bracket realtime events into one refresh + at most one viewer
 * notification per logical admin save.
 *
 * One score save fans out into several `match` row writes (the score itself,
 * winner/loser propagation into later rounds, archival of earlier rounds),
 * and each row emits a realtime event. Reacting per event meant a burst of
 * query refetches and a toast storm for every viewer.
 *
 * Module-level state is intentional: two hook instances can watch the same
 * bracket simultaneously (bracket view + page layout). Keyed by
 * `${bracketId}:${stageId}`, their events land in one shared timer, so a
 * burst still produces a single flush — the last-registered handler wins.
 */

interface BracketRefreshHandler {
  /** Refresh cached bracket queries (invalidate + refetch). */
  invalidate: () => void;
  /** Show the user-facing "bracket updated" notification. */
  notify: () => void;
}

/** Trailing debounce: a save's writes land well within this window. */
const DEBOUNCE_MS = 1500;

/**
 * Minimum gap between notifications per bracket. Back-to-back saves (e.g. an
 * admin entering several scores) refresh data on every flush but read as ONE
 * ongoing update to viewers.
 */
const NOTIFY_FLOOR_MS = 5000;

const pending = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; handler: BracketRefreshHandler }
>();
const lastNotifyAt = new Map<string, number>();

export function scheduleBracketRefresh(key: string, handler: BracketRefreshHandler): void {
  const existing = pending.get(key);
  if (existing) clearTimeout(existing.timer);

  const timer = setTimeout(() => {
    const entry = pending.get(key);
    pending.delete(key);
    if (!entry) return;

    entry.handler.invalidate();

    const now = Date.now();
    const last = lastNotifyAt.get(key) ?? 0;
    if (now - last >= NOTIFY_FLOOR_MS) {
      lastNotifyAt.set(key, now);
      entry.handler.notify();
    }
  }, DEBOUNCE_MS);

  pending.set(key, { timer, handler });
}

/** Test-only: clear all timers and notification bookkeeping. */
export function __resetBracketRealtimeCoalescerForTests(): void {
  for (const { timer } of pending.values()) clearTimeout(timer);
  pending.clear();
  lastNotifyAt.clear();
}

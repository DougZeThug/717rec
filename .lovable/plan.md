

## Plan: Fix realtime retry by recreating the channel instance

### The bug

In `src/hooks/brackets/useBracketsManagerRealtime.ts`, the `CHANNEL_ERROR` retry tears down the channel with `supabase.removeChannel(channel)` and then immediately calls `channel.subscribe()` on that same (now-removed) channel. Phoenix's underlying channel sets `joinedOnce = true` on the first join and never resets it, so the retry throws `"tried to join multiple times..."` inside the `setTimeout` callback. The exception is swallowed, `realtimeEnabled` stays `false`, and the user gets no more live bracket updates until they refresh.

### The fix

Refactor the subscription into a small `connect()` helper inside the existing `useEffect` so retries create a brand-new channel each time, with all listeners reattached. Await `removeChannel` before reconnecting to avoid racing teardown.

Sketch (inside the existing effect in `useBracketsManagerRealtime.ts`):

```ts
let currentChannel: ReturnType<typeof supabase.channel> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let hasRetried = false;

const connect = () => {
  const channelName = `bracket-matches-${bracketId}-${stageId}-${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'match', filter: `stage_id=eq.${stageId}` },
      (payload) => { /* same handler as today */ })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setRealtimeEnabled(true);
      } else if (status === 'CHANNEL_ERROR') {
        setRealtimeEnabled(false);
        if (!hasRetried) {
          hasRetried = true;
          retryTimer = setTimeout(async () => {
            if (currentChannel) await supabase.removeChannel(currentChannel);
            currentChannel = connect(); // brand-new channel, fresh joinedOnce
          }, 2000);
        } else {
          errorLog('Realtime subscription FAILED after retry', { bracketId, stageId });
        }
      }
    });
  return channel;
};

currentChannel = connect();

return () => {
  if (retryTimer) clearTimeout(retryTimer);
  if (currentChannel) supabase.removeChannel(currentChannel);
  setRealtimeEnabled(false);
};
```

Behavioral notes:
- The realtime payload handler, toast, and cache-invalidation logic stay identical.
- `hasRetried` still caps retries at one attempt per effect lifecycle (matches today's behavior).
- Cleanup always tears down whichever channel is currently active (original or retry).
- A unique channel name (already includes `Date.now()`) avoids handshake collisions on the new instance.

### Files touched

- Edit: `src/hooks/brackets/useBracketsManagerRealtime.ts` — extract `connect()`, recreate channel on retry, await `removeChannel`.

### Verification

1. Manual: open the Playoffs page, confirm "Realtime ON" indicator appears. Temporarily simulate a channel error (e.g., revoke realtime perms or disconnect Wi-Fi briefly) — within ~2s, the indicator should recover to ON instead of staying OFF.
2. Console logs show "Realtime CHANNEL_ERROR — retrying once in 2s" followed by a new "Realtime subscription to match table ACTIVE" without the Phoenix "tried to join multiple times" exception.
3. No regression on first-time subscribes or on unmount cleanup.

### Rollback

Revert the single file. One step.


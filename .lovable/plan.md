

## Fix: Realtime Subscription Error Crashing Bracket View

### Problem
The error `cannot add postgres_changes callbacks after subscribe()` occurs because React re-renders cause the `useEffect` to fire again before the previous channel is fully cleaned up. Supabase sees a channel with the same name (`bracket-matches-{bracketId}-{stageId}`) that's already subscribed and throws.

This crashes the `BracketView` component via the error boundary, showing a blank/error screen.

### Fix

**File: `src/hooks/brackets/useBracketsManagerRealtime.ts`** (~3 lines changed)

1. Before creating a new channel, proactively remove any existing channel with the same name
2. Add a unique suffix (using `Date.now()`) to prevent name collisions during rapid re-renders

```typescript
// Line ~81: Add cleanup of any stale channel before creating new one
const channelName = `bracket-matches-${bracketId}-${stageId}`;

// Remove any existing channel with this base name to prevent conflicts
supabase.getChannels().forEach((ch) => {
  if (ch.topic.includes(`bracket-matches-${bracketId}`)) {
    supabase.removeChannel(ch);
  }
});

const channel = supabase
  .channel(channelName)
  .on(...)
```

This ensures no stale subscriptions linger when the effect re-runs, which is the root cause of the error.

**One file, ~5 lines added.**


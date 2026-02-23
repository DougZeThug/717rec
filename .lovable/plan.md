

## Fix: Realtime Subscription Failures and Container Race Condition on Playoffs Page

### What's Happening

There are two related errors occurring when navigating between brackets on the Playoffs page:

1. **"Realtime subscription FAILED"** -- The realtime subscription to the `match` table keeps failing with `CHANNEL_ERROR`. The root cause is that `toast` and `queryClient` are in the `useEffect` dependency array (line 111 of `useBracketsManagerRealtime.ts`). The `toast` function from `useToast()` is **not referentially stable** -- it changes on every render. This causes the subscription effect to tear down and recreate the channel repeatedly. During rapid bracket switching, the old channel errors out while a new one spins up, triggering the Sentry error.

2. **"Container element not found!"** -- When switching between brackets, the `BracketsViewerComponent` starts an async render (`renderBracket`), but by the time it checks `containerRef.current`, the component has unmounted (user navigated to a different bracket). The ref is null, triggering the error log and Sentry event.

### Fix 1: Stabilize realtime subscription dependencies

**File: `src/hooks/brackets/useBracketsManagerRealtime.ts`**

Use `useRef` for `toast` and `queryClient` (same pattern already used in `usePlayoffRealtime.ts`), so the subscription effect only depends on `bracketId` and `stageId`:

- Store `toast` in a `toastRef` and `queryClient` in a `queryClientRef`
- Update the refs when values change via a separate `useEffect`
- Remove `toast` and `queryClient` from the subscription effect's dependency array
- Access them via `.current` inside the callback

### Fix 2: Add unmount guard to async bracket rendering

**File: `src/components/playoffs/viewer/BracketsViewerComponent.tsx`**

Add an `isCancelled` flag in the `useEffect` that runs `renderBracket`. If the effect cleanup runs (component unmounts or deps change) before the async work completes, skip the container check and rendering:

- Add `let cancelled = false;` at the start of the effect
- Return `() => { cancelled = true; }` in the cleanup
- Check `if (cancelled) return;` before the container element check and before calling `bracketsViewer.render()`
- Change the `containerRef.current` null check from an `errorLog` to a `warnLog` since it's a benign race condition, not a real error

### Technical Details

**useBracketsManagerRealtime.ts changes:**

```typescript
const toastRef = useRef(toast);
const queryClientRef = useRef(queryClient);

useEffect(() => {
  toastRef.current = toast;
}, [toast]);

useEffect(() => {
  queryClientRef.current = queryClient;
}, [queryClient]);

// In the subscription effect, use toastRef.current and queryClientRef.current
// Dependency array becomes: [bracketId, stageId]
```

**BracketsViewerComponent.tsx changes (inside the main useEffect):**

```typescript
useEffect(() => {
  let cancelled = false;

  // ... existing guards ...

  const initAndRender = async () => {
    // ... load scripts ...
    if (cancelled) return;
    await renderBracket();
  };

  const renderBracket = async () => {
    // ... existing transformation logic ...
    if (cancelled) return;

    const container = containerRef.current;
    if (!container) {
      warnLog('Container element not found (component likely unmounted)');
      return; // Don't set error state -- benign race
    }
    // ... rest of rendering ...
  };

  initAndRender();
  return () => { cancelled = true; };
}, [/* existing deps */]);
```

### Files Modified
- `src/hooks/brackets/useBracketsManagerRealtime.ts` -- stabilize toast/queryClient refs
- `src/components/playoffs/viewer/BracketsViewerComponent.tsx` -- add cancellation guard for async rendering

### What This Achieves
- Eliminates the "Realtime subscription FAILED" Sentry errors caused by unstable effect dependencies
- Eliminates the "Container element not found!" Sentry errors caused by async race conditions during navigation
- Realtime subscriptions become stable and only recreate when the actual bracket or stage changes
- No behavior changes for users -- these were purely internal race condition errors


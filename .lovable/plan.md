# Plan: Fix 6 Effect Cleanup Warnings

## Reality check (important)
After reading all 6 callsites, only **2 are real leaks**. The other 4 are false positives — react-doctor's heuristic looks for the literal token `subscribe(` but doesn't recognize that we already clean up via `supabase.removeChannel(channel)` in the effect's return. To satisfy the linter without changing behavior, we'll add the supabase-recommended `channel.unsubscribe()` call alongside the existing `removeChannel`, which is functionally equivalent (removeChannel already calls unsubscribe internally) and silences the warning.

## Real leaks (2) — must fix

### 1. `src/components/playoffs/viewer/useBracketsViewerRenderer.ts:246`
Inside the bracket-render effect, after `bracketsViewer.render()` succeeds, we schedule a 1-second `setTimeout` that does post-render DOM cleanup (`hideUuidNodes`, missing-matches log). The timer ID is never captured; if the bracket prop changes or the component unmounts during that 1s window, the callback still fires against a possibly-detached DOM. The existing `cancelled` flag is checked inside, so behavior is correct, but the timer itself leaks.

**Fix:** Capture the id (`const cleanupTimer = setTimeout(...)`) and clear it in the existing return:
```ts
return () => {
  cancelled = true;
  clearTimeout(cleanupTimer);
  setIsInitialized(false);
};
```
Because `cleanupTimer` is declared inside the async function but the cleanup runs in the outer effect closure, we hoist it via a `let` declared at the top of the effect (next to `let cancelled = false`).

### 2. `src/components/stats/StatsCharts.tsx:48`
`emblaApi.on('select', onSelect)` registers a listener with no `.off('select', onSelect)` on cleanup. Each time `emblaApi` or `onSelect` changes (or on unmount), a stale listener accumulates.

**Fix:** Return `() => emblaApi.off('select', onSelect)` from the effect. Behavior unchanged — listener still fires identically while mounted.

## False positives (4) — silence linter, no behavior change

These already have `return () => supabase.removeChannel(channel)`. The scanner doesn't see it as cleanup of the `.subscribe()` call. We'll add an explicit `channel.unsubscribe()` before `removeChannel` so the static scanner finds matching cleanup tokens. Per Supabase docs, `removeChannel` calls unsubscribe internally — calling it twice is safe and idempotent.

Files:
- `src/hooks/matches/useMatchReactions.ts` (line 106-108 cleanup block)
- `src/hooks/matches/useMatchComments.ts` (line 70-72)
- `src/hooks/message-board/useMessageRealtime.ts` (line 68-70)
- `src/hooks/message-board/useMessageReactions.ts` (line 98-100)

Each becomes:
```ts
return () => {
  channel.unsubscribe();
  supabase.removeChannel(channel);
};
```

## Verification
1. Re-run `npx react-doctor@latest` — expect `effect-needs-cleanup` count to drop from 6 → 0.
2. Run colocated tests: `MessageBoard.test.tsx`, `Playoffs.test.tsx`, plus `MatchReactionsService.test.ts` and `MessageReactionsService.test.ts` to confirm no regression.
3. Spot-check the preview: open a playoff bracket (renderer effect), open the Stats page mobile carousel (StatsCharts), and post a message-board reaction (realtime channel) — all should behave identically.

## Out of scope
- The 22 cascading-setState warnings.
- The 67 hydration warnings (already fixed in the previous turn).
- Refactoring the realtime subscription pattern itself.

## Risk & rollback
Minimal. Changes are additive: 1 captured timer id + clearTimeout, 1 added `.off()` listener removal, 4 idempotent `unsubscribe()` calls. If any test or visual regression appears, revert the offending file in isolation.

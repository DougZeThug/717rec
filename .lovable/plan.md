

## Plan: Fix Playoffs season-default race condition

### The bug

In `usePlayoffPageData.ts` (lines 61–69), the effect that picks the default season runs as soon as either query resolves. If `activeSeason` returns from cache first, it gets selected — and the `if (selectedSeasonId) return` guard then blocks the correction when `playoffSeason` (the higher-priority pick) arrives moments later. Result: users land on the regular season's empty bracket page instead of the in-progress playoff season.

### The fix

Wait for **both** queries to settle before choosing a default. TanStack Query's `data` is `undefined` while loading and `null`/object once settled, so we just gate on that.

```ts
useEffect(() => {
  if (selectedSeasonId) return;
  // Wait until both queries have settled
  if (playoffSeason === undefined || activeSeason === undefined) return;

  if (playoffSeason) {
    setSelectedSeasonId(playoffSeason.id);
  } else if (activeSeason) {
    setSelectedSeasonId(activeSeason.id);
  }
}, [playoffSeason, activeSeason, selectedSeasonId]);
```

Also add `selectedSeasonId` to the dependency array (it's already used inside) and drop the `eslint-disable-next-line` since deps will now be exhaustive.

### Files touched

- Edit: `src/components/playoffs/hooks/usePlayoffPageData.ts` — replace the effect at lines 61–69.

### Test coverage

Add `src/components/playoffs/hooks/__tests__/usePlayoffPageData.season-default.test.ts` with three cases (mock `useActiveSeason` and `usePlayoffActiveSeason`, plus the other hooks the file imports as no-ops):
1. **Race case**: `activeSeason` resolves first (playoff still `undefined`) → no selection yet. Then `playoffSeason` resolves → `selectedSeasonId === playoffSeason.id`. (This is the regression test.)
2. **No playoff in progress**: `playoffSeason` settles to `null`, `activeSeason` to a season → falls back to active season's id.
3. **Both already cached**: both resolved on first render → picks `playoffSeason.id`.

### Verification

1. `npm test` — new test passes; existing playoff tests still pass.
2. Manual: with a partially-archived season in progress, navigate Stats → Playoffs → page lands on the playoff season, not the regular active season.
3. No behavior change when there's no overlap (single active season, no playoffs in progress).

### Rollback

Revert the one hook file and delete the new test. One step.


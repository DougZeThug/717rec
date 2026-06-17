## Goal

When a bracket is marked `completed` but final standings haven't been written (the "Standings Pending" case), give admins a button to retry the calculation on demand instead of waiting for another realtime event.

## Where the button goes

In `src/components/playoffs/BracketDetail.tsx`, in the header action row next to "Update Seeding", "Edit Bracket", and "Delete". Only rendered when:

- `isAdminAccessGranted` is true
- `bracket.state === 'completed'`
- No standings exist yet for this bracket (i.e. `fetchFinalStandings(bracketId)` returns an empty array)

Label: **Recalculate Standings** (icon: `RefreshCw` from lucide-react). While running it shows a spinner and is disabled.

## How it works

1. New hook `useRecalculateStandings(bracketId)` in `src/hooks/useRecalculateStandings.ts`:
   - Calls `bracketManagerService.calculateFinalStandings(bracketId)`.
   - Reads the returned `FinalStandingsResult` and shows a toast:
     - `written` → success toast "Final standings calculated".
     - `incomplete-matches` → info toast "Bracket still has unfinished matches".
     - `calculation-error` / `no-stages` / `no-records` → warning toast "Could not calculate standings yet — check that all matches are complete."
   - On success, invalidates the `['final-standings', bracketId]` query so `FinalStandings` re-fetches and renders.
   - Exposes `{ recalculate, isRecalculating }`.

2. In `BracketDetail`:
   - Query existing standings via `useQuery(['final-standings', bracketId], () => fetchFinalStandings(bracketId), { enabled: bracket.state === 'completed' })`.
   - Render the button only when standings array is empty (or query has not returned any records).
   - Wire `onClick` to `recalculate()`.

## Files touched

- `src/hooks/useRecalculateStandings.ts` — new hook.
- `src/components/playoffs/BracketDetail.tsx` — query existing standings, render the new admin button conditionally.
- `src/hooks/__tests__/useRecalculateStandings.test.tsx` — unit tests covering: written → success toast + invalidates query; incomplete-matches → info toast, no invalidation; thrown error → caught and warning toast.

## Out of scope

- No changes to `useBracketCompletion` (the existing toast behavior stays).
- No changes to the standings service or backend logic.
- No visual changes to `FinalStandings` itself.

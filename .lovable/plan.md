## What I’ll fix

Restore the **Playoffs page** by removing the browser crash caused by the Node-only `brackets-manager` package, then return to the original security finding for `season_team_participation`.

## Why the page is failing

The Playoffs route is loading code that imports `brackets-manager` into the browser bundle. That package extends Node’s `EventEmitter`, but Vite externalizes the `events` module in the browser, so the page crashes with:

```text
class heritage events_1.EventEmitter is not an object or null
```

This is happening before the page can render, so fixing the RLS policy alone would not restore the page.

## Plan

### 1) Stop the Playoffs page from importing Node-only bracket code on initial load
- Remove browser-route import paths that currently pull in `@/services/brackets/manager` during normal page render.
- Replace eager imports with safer boundaries:
  - keep pure read/query logic in browser-safe services/hooks
  - move `brackets-manager` usage behind lazy/dynamic imports only when an admin performs a bracket-management action, or into a separate admin-only action layer
- Prioritize the files currently implicated in the Playoffs load path:
  - `src/hooks/playoffs/usePlayoffMatchUpdate.ts`
  - `src/hooks/useBracketCompletion.ts`
  - `src/components/playoffs/match-score-editor/useMatchEditorState.ts`
  - `src/components/playoffs/SeedingUpdateDialog.tsx`
  - `src/hooks/playoffs/usePlayoffEditMatchParticipants.ts`

### 2) Break the barrel-import crash chain
- Update any browser-facing imports that currently come from broad barrels when a narrower browser-safe module exists.
- In particular, avoid browser code depending on a service barrel that can pull manager-related code into the same chunk.
- Keep `FinalStandings` and the standard bracket read flow on browser-safe read services only.

### 3) Validate the Playoffs route loads again
- Confirm `/playoffs` renders without the `EventEmitter` runtime error.
- Confirm normal read-only behaviors still work:
  - list brackets
  - load selected bracket
  - render Challonge fallback when enabled
- If admin-only mutation features need the manager code, ensure they load only when triggered rather than on page boot.

### 4) Fix the original security finding for participation inserts
- Add a migration for `public.season_team_participation` that:
  - drops the current public INSERT policy
  - adds an authenticated-only INSERT policy
  - requires `submitted_by = auth.uid()`
  - allows submit only if the user is a member of the referenced team, with admin override
- Keep existing public read behavior unchanged.

### 5) Add a small service guard for a clearer error
- Update `SeasonService.submitParticipation` so it throws a friendly auth error before calling Supabase when there is no logged-in user, instead of relying on a raw RLS failure.

## Technical details

```text
Current problem
Playoffs route -> browser hook/component -> import from manager layer
-> brackets-manager -> require('events') -> Vite browser externalization
-> EventEmitter undefined -> page crash
```

```text
Target state
Playoffs route -> browser-safe read services only on initial render
Admin mutation actions -> lazy import manager code only when needed
```

## Files likely to change
- `src/hooks/playoffs/usePlayoffMatchUpdate.ts`
- `src/hooks/useBracketCompletion.ts`
- `src/components/playoffs/match-score-editor/useMatchEditorState.ts`
- `src/components/playoffs/SeedingUpdateDialog.tsx`
- `src/hooks/playoffs/usePlayoffEditMatchParticipants.ts`
- `src/components/playoffs/FinalStandings.tsx` or related read imports if needed
- `src/services/SeasonService.ts`
- `supabase/migrations/<new_timestamp>_season_team_participation_insert_policy.sql`

## Expected result
- `/playoffs` loads again
- admin bracket tools still work through a safer import path
- the `season_team_participation_public_insert` security finding is resolved
## Goal

The recap page's rich sections (Games, Player stats, Round-by-round) already self-hide when there's no live-scoring data, but the new **"View match recap"** button on the schedule shows for every completed match. For matches scored the traditional admin way, that button leads to a near-empty page. Hide the button unless live-scoring data exists for that match.

## Detection rule

A match is "live-scored" if it has at least one row in the `games` table with that `match_id`. (Matches without any games row = traditional admin entry.)

## Changes

### 1. New service: `src/services/liveScoring/LiveScoredMatchesService.ts`

Exports `fetchLiveScoredMatchIds(matchIds: string[]): Promise<Set<string>>`.

- Bulk query: `supabase.from('games').select('match_id').in('match_id', matchIds)`
- Returns a `Set` of distinct `match_id` values that have ≥1 game row.
- Uses `handleDatabaseError`; returns empty set when `matchIds` is empty.

### 2. New hook: `src/hooks/live-scoring/useLiveScoredMatchIds.ts`

Thin TanStack Query wrapper:
- Key: `['live-scored-match-ids', sortedMatchIds]`
- `staleTime`: 5 min (matches existing cache norms)
- `enabled`: `matchIds.length > 0`
- Returns `{ liveScoredIds: Set<string>, isLoading }`.

### 3. `src/components/schedule/ScheduleContent.tsx` (or the nearest common parent that already has the full match list)

- Compute `completedIds = matches.filter(m => isCompleted(m)).map(m => m.id)`.
- Call `useLiveScoredMatchIds(completedIds)`.
- Pass the resulting `Set` down through `DateMatchGroup` → `TimeSlotMatchGroup` → `MatchCard` as a single `liveScoredMatchIds: Set<string>` prop (drilled, no context needed — the chain is only 3 levels).

### 4. `src/components/schedule/MatchCard.tsx`

- Accept new optional prop `liveScoredMatchIds?: Set<string>` (default `undefined`).
- Derive `const hasRecap = liveScoredMatchIds?.has(match.id) ?? false;`
- Gate the recap CTA:
  ```tsx
  {isCompleted && !hasSpecialStatus && hasRecap && ( ...View match recap link... )}
  ```
- No visual/styling changes; only the conditional is tightened.

### 5. Tests

- Update `src/components/schedule/__tests__/MatchCard.test.tsx`:
  - Add case: completed match **with** `liveScoredMatchIds` containing its id → recap link visible.
  - Add case: completed match **without** it → recap link absent.
- Update `TimeSlotMatchGroup` / `DateMatchGroup` tests only if their prop drilling breaks type-wise (pass empty `Set` in existing tests).

## Out of scope

- No change to `CompletedMatchReview.tsx` — its section-level `.length > 0` gates already handle the empty case correctly for any user who reaches the page via direct URL.
- No change to playoff match cards, admin mass-entry, or the live-scoring "Live score this match" CTA (still shown for upcoming matches regardless).
- No DB migration — reuses existing `games` table.

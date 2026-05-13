## Bug verified

`src/services/brackets/manager/SupabaseSqlStorage.ts` lines 206–212: the defensive-merge pre-fetch destructures only `data` from a `.single()` call, silently dropping `error`. Any non-PGRST116 failure (timeout, RLS denial, transient connection error) yields `currentMatch = null`, which `mergeOpponentSlots(null, patch)` treats as "no protection" — the very condition the defensive merge exists to prevent.

Also violates the project's core convention: use `.maybeSingle()` (memory: "Database API: Throw via `handleDatabaseError`. Use `.maybeSingle()` instead of `.single()`").

## Fix

Single file: `src/services/brackets/manager/SupabaseSqlStorage.ts`, lines 206–212.

```ts
const { data: currentMatch, error: fetchError } = await client
  .from('match')
  .select(
    'id, opponent1_id, opponent2_id, opponent1_result, opponent2_result, round_id, group_id, number, status'
  )
  .eq('id', matchId as number)
  .maybeSingle();

if (fetchError) {
  handleDatabaseError(fetchError, 'Failed to fetch match for defensive merge');
}
```

`handleDatabaseError` is already imported (line 5). `maybeSingle()` returns `{ data: null, error: null }` for genuine "no row" cases, preserving the existing intentional `currentMatch = null` path that `mergeOpponentSlots` handles. Real DB errors now throw instead of being swallowed.

## Verification

- Existing bracket update tests still pass: `npm run test:file -- src/services/brackets/manager/__tests__/SupabaseSqlStorage.test.ts` (if present), plus any `mergeOpponentSlots` tests.
- Manual: edit a bracket match — works as before in the happy path.
- Negative: no easy way to reproduce a transient DB error in dev; covered by behavior contract (errors now throw and surface to the bracket update flow's existing try/catch).

Risk: Low. Single-line behavioral fix that aligns with the rest of the codebase. Rollback: trivial.
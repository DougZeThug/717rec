

## Fix: Clear winner/loser fields when match is incomplete or tied

### Problem

`determineMatchOutcome` in `src/components/schedule/form-utils.ts` returns `{}` for incomplete or tied matches. The destructured `winnerId`/`loserId` become `undefined`, and Supabase's `.update()` silently omits `undefined` properties from the PATCH payload. This means existing `winner_id`/`loser_id` values are never cleared, causing stale wins in standings.

### Fix

**File: `src/components/schedule/form-utils.ts`**

Update `determineMatchOutcome` to return explicit `null` values instead of `{}`, and update the return type accordingly:

- Change return type from `{ winnerId?: string; loserId?: string }` to `{ winnerId: string | null; loserId: string | null }`
- Return `{ winnerId: null, loserId: null }` for incomplete, missing-score, and tied cases
- No change needed for the winner/loser determination branches (they already return string values)

### Why this works

Supabase's `.update()` includes `null` properties in the PATCH payload (setting the column to NULL), but omits `undefined` properties entirely. Changing from `undefined` to `null` ensures the database columns are actually cleared.

### Scope

Only `src/components/schedule/form-utils.ts` is modified. The callers (`MatchForm.tsx`, `MatchFormRHF.tsx`) already destructure and pass these values through without type issues since `string | null` is compatible with the Supabase update payload types.




## Fix: Replace `select('*')` in create-bracket Edge Function

### What's wrong

`supabase/functions/create-bracket/index.ts` line 617 uses `.select('*')`, violating the project rule against wildcard selects.

### Fix

**File:** `supabase/functions/create-bracket/index.ts` (line 617)

Replace:
```ts
.select('*')
```

With:
```ts
.select('id, title, division_id, format, state, challonge_tournament_id, created_at')
```

These are the exact 7 fields used downstream: `bracketData.id` (lines 625, 631, 657, 660, 851, 854), `.challonge_tournament_id`, `.division_id`, `.title`, `.format`, `.state`, `.created_at` (lines 855-860 building the response record).

### Scope

One file, one line. No behavioral change — same data returned, just explicitly listed.


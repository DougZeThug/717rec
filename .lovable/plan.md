

## Plan: Apply pending `playoffs_active` migration to fix 45 build errors

### Root cause

A migration file exists at `supabase/migrations/20260421_add_playoffs_active.sql` that adds:
- `playoffs_active boolean NOT NULL DEFAULT false` column on `seasons`
- A `BEFORE INSERT/UPDATE` trigger (`ensure_single_playoffs_active_season`) enforcing only one playoffs-active season at a time
- Two new RPCs: `partial_archive_season` and `finalize_playoffs`
- Updates the existing `activate_season` and adds `activate_season_with_partial_archive`

**This migration has never been applied to the live database.** Verified: the `seasons` table currently has no `playoffs_active` column.

Because every `SeasonService` query selects `playoffs_active`, Supabase's typed client widens the result to `SelectQueryError<"column 'playoffs_active' does not exist on 'seasons'">`. That error type has no `.id`, `.name`, `.is_active`, etc., which cascades into all 45 reported errors across 12 files.

### Fix (one migration, two tiny code edits)

**1. Apply the pending migration** — re-run `supabase/migrations/20260421_add_playoffs_active.sql` against the live database. This adds the column, trigger, and RPCs. Once the column exists, Supabase regenerates `src/integrations/supabase/types.ts` and all 43 cascade errors disappear automatically. The `@ts-expect-error` lines in `SeasonService.ts` (lines 83-85, 340-342, 360-362) will then start failing for being unused — they can stay for one more push and be removed in a follow-up, OR I'll remove them in this same change to keep the build clean.

**2. Fix `src/components/admin/seasons/__tests__/SeasonForm.test.tsx`** (1 line) — add `playoffs_active: false` to the `mockSeason` object. The `Season` type now requires this field.

**3. Fix `src/services/SeasonService.ts` `fetchHistoricalSeasons`** (1 line) — extend its `.select(...)` from `'id, name, start_date, end_date, is_active'` to include `is_archived, playoffs_active, created_at, champion_team_id, runner_up_team_id, confirmation_open` so its return type matches `Season[]` (the hook `useHistoricalSeasons` is typed against the full `Season` shape).

### Files touched

- Apply migration: `supabase/migrations/20260421_add_playoffs_active.sql` (existing — just run it)
- Edit: `src/services/SeasonService.ts` (extend `fetchHistoricalSeasons` select; remove the 3 `@ts-expect-error` lines after types regenerate)
- Edit: `src/components/admin/seasons/__tests__/SeasonForm.test.tsx` (add `playoffs_active: false`)

### Edge function "errors" at top of report

Same pre-existing Deno typecheck noise as last time — unrelated, not addressed here.

### Verification

1. Migration runs cleanly (column added, trigger created, RPCs registered).
2. `npm run typecheck` clears all 45 errors.
3. Existing season behavior unchanged (column defaults to `false` on every existing season).

### Rollback

Migration is additive only (adds column with safe default, adds new RPCs/trigger). Rolling back means dropping the column and trigger — one reverse migration. Code edits revert in one step.


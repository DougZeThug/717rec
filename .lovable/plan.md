# Fix the power_unification_admin smoke test failure

## What is broken

The smoke test calls `admin_revert_power_score_unification()`. That function
drops and re-creates `v_team_season_agg` with the old (pre-unification) column
list. That list has **no `career_power_score` column**.

Right after, the function calls `upsert_team_season_stats(true)`, which selects
`career_power_score` from that view. The column is gone, so the whole test
fails with:

`ERROR: column "career_power_score" does not exist`

Confirmed by inspection:
- Live `v_team_season_agg` **does** have `career_power_score`.
- `upsert_team_season_stats` **does** reference it.
- `admin_revert_power_score_unification` and
  `admin_reapply_power_score_unification` **never mention it** — both were
  written before the career/season power-score split and were never updated.

So `admin_reapply_power_score_unification()` is broken the same way, not only
revert.

## The fix

One SQL migration that re-creates both admin functions so every version of
`v_team_season_agg` they build also exposes `career_power_score`:

- **Revert path**: add a `career_power_score` column to the legacy view using
  the legacy (pre-unification) formula, so the reverted view keeps the same
  shape the rest of the database expects.
- **Reapply path**: add `career_power_score` using `power_score_100_career(...)`,
  matching the current live view definition exactly.
- Leave `upsert_team_season_stats` unchanged — it is correct.
- No score values change on the live database. The live view already matches
  what reapply will produce.

## Verification

1. Run the smoke test `supabase/tests/power_unification_admin.sql` — it must
   reach `ROLLBACK` with no error.
2. Re-run the full smoke suite to confirm nothing else regressed.
3. Confirm the live `v_team_season_agg` definition is unchanged after the
   migration (the migration only replaces function bodies).

## Technical notes

- Files touched: one new file under `supabase/migrations/`.
- Both functions are `SECURITY DEFINER`; the migration keeps their existing
  `search_path` pin, admin check, grants, and owner.
- The view is re-created `WITH (security_invoker = on)` in both branches, as
  today.

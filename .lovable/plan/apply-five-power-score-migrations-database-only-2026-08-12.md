# Apply five power-score migrations (database only)

## Prerequisite check — PASSED
`SELECT count(*) FROM public.power_score_rollout_ddl_backup;` returns **15** rows, so the backup migration is already applied. Safe to continue.

## What I will do
Apply these five migration files verbatim, one at a time, in this order:

1. `20260811210000_power_score_weighted_denominators.sql`
2. `20260812110000_fix_member_update_guard_is_hidden.sql`
3. `20260812120000_power_score_match_date.sql`
4. `20260812130000_power_score_historical_opponent_division.sql`
5. `20260812140000_power_score_formula_control_bypass.sql`

Rules I will follow:
- SQL is copied exactly from the repo files. No edits, no reformatting.
- File 5 keeps its internal statement order (backfill first, then the archived-season freeze). It is applied as one migration.
- No frontend code, no `types.ts`, no other files change.
- If any migration fails, I stop there and report which one and why.

## Expected effect
Stored power scores are rewritten across seasons. That is intended.

## Reporting after all five apply
I will run and report both checks:
- Counts by `resolved_by` from `v_power_score_team_matches_rated`.
- Top 25 before/after/delta power scores vs `team_details_pre_power_rollout`.

If `unresolved` is a large share of the first query, I will say so plainly and not call the rollout finished.

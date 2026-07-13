# Supabase SQL smoke tests

Small, dependency-free SQL scripts that assert post-migration invariants.
These now run automatically in CI via
`.github/workflows/supabase-ci.yml` (`db-apply-and-smoke` job) on every PR
that touches `supabase/**`. See `docs/SUPABASE_CI.md` for the full setup.

## Running

```bash
psql "$SUPABASE_DB_URL" -f supabase/tests/seasons_rls.sql
```

Each script uses `\set ON_ERROR_STOP on` and `RAISE EXCEPTION` on failure,
so a non-zero exit code means drift was detected.

## Current tests

- `seasons_rls.sql` — confirms the four canonical RLS policies on
  `public.seasons` are present and attached to the expected roles.
  Backed by the `public.seasons_rls_drift()` helper function.
- `migrations_apply.sql` — sanity check that core tables exist after
  the full migration set (baseline + all migrations) has been applied.
- `score_stats_business_logic.sql` — end-to-end business-rule coverage for
  score/stat RPCs: approving match results, marking ties, deleting completed
  matches with stats reversal, finalizing/reopening live matches,
  update/reverse team stat guardrails, season-stat refreshes, and scorer
  authorization for admins and approved team members.
- `_bootstrap.sql` — CI-only Supabase stubs (auth/storage/roles/realtime
  publication). Files prefixed with `_` are helpers and are skipped by
  the smoke runner.

The core tables themselves come from
`supabase/migrations/00000000000000_baseline.sql` (see
`docs/SUPABASE_CI.md`), which recreates the pre-migration dashboard-era
schema so the whole chain can replay on an empty database.

## Adding a new smoke test

1. Create `supabase/tests/<topic>.sql` (no leading underscore).
2. Start with `\set ON_ERROR_STOP on`.
3. `RAISE EXCEPTION` on drift; print `RAISE NOTICE` on success.
4. Open a PR and confirm the `db-apply-and-smoke` CI job picks it up.

## Drift-prevention rule

Any future migration that touches `public.seasons` policies MUST keep
`Anyone can view seasons` for role `public` (or an equivalent
`TO anon, authenticated` SELECT policy). Public read is intentional —
standings, history, and the marketing site depend on it.

See `docs/RLS_NOTES.md` for the full access model.
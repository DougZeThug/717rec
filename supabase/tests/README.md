# Supabase SQL smoke tests

Small, dependency-free SQL scripts that assert post-migration invariants.
They are not wired into CI yet — run them manually after a migration touches
the relevant area.

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

## Drift-prevention rule

Any future migration that touches `public.seasons` policies MUST keep
`Anyone can view seasons` for role `public` (or an equivalent
`TO anon, authenticated` SELECT policy). Public read is intentional —
standings, history, and the marketing site depend on it.

See `docs/RLS_NOTES.md` for the full access model.
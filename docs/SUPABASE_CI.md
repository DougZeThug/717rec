# Supabase CI

`.github/workflows/supabase-ci.yml` verifies database migrations and edge
function code on every PR that touches `supabase/**`. It runs on push to
`main` and weekly via cron as well.

## The baseline migration (migration 0)

`supabase/migrations/00000000000000_baseline.sql` recreates the schema as
it existed *before* the first checked-in migration (May 2025). The
project's core tables (`teams`, `matches`, `seasons`, `divisions`, …) were
created in the Supabase dashboard before migrations were adopted, so no
regular migration creates them — without the baseline, a fresh database
cannot be rebuilt and the apply job below would fail on the very first
file.

Two properties to preserve when touching it:

1. **It only contains pre-migration state.** Anything a later migration
   adds (columns, views, functions) must NOT be in the baseline, or that
   later migration breaks on replay.
2. **Every statement is guarded** (`IF NOT EXISTS` / catalog lookups), so
   applying it to the real project — where everything already exists — is
   a complete no-op. It never drops or replaces anything. Sections that
   only make sense when rebuilding from zero (historical seed rows,
   dashboard-era policies that later migrations drop, default grants) are
   additionally gated on a fresh-database sentinel, so they cannot
   re-create rows, policies, or grants that later hardening migrations
   removed from the live project.

The baseline was reconstructed from `src/integrations/supabase/types.ts`
(the auto-generated live-schema snapshot) plus evidence in later
migrations and app code, then verified by replaying all migrations on a
fresh Postgres. Column types are best-effort where the snapshot is
ambiguous. If you ever run `supabase db dump --linked` against the live
project, its output can replace the reconstructed table definitions
wholesale.

## What runs

1. **`db-lint`** — `supabase db lint --level warning` over the migrations
   directory. Fails on lint errors.
2. **`db-apply-and-smoke`** — spins up a `postgres:15` service container,
   applies `supabase/tests/_bootstrap.sql` (CI-only Supabase stubs), then
   applies every file in `supabase/migrations/*.sql` in lexical order.
   After apply, runs every `supabase/tests/*.sql` smoke script with
   `psql -v ON_ERROR_STOP=1`. Any error in apply or smoke fails the job.
3. **`edge-function-tests`** — runs `deno test` across
   `supabase/functions/`. Safe placeholder env vars are exported; tests
   that need real network must guard themselves (e.g. check `SUPABASE_CI`).

## Reproducing locally

```bash
# 1. start a throwaway postgres
docker run --rm -d --name supa-ci -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres postgres:15
export PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres PGDATABASE=postgres

# 2. bootstrap + apply
psql -v ON_ERROR_STOP=1 -f supabase/tests/_bootstrap.sql
for f in $(ls supabase/migrations/*.sql | sort); do
  psql -v ON_ERROR_STOP=1 -f "$f" || break
done

# 3. smoke
for f in supabase/tests/*.sql; do
  [[ "$(basename "$f")" == _*.sql ]] && continue
  psql -v ON_ERROR_STOP=1 -f "$f"
done

# 4. edge function tests
deno test --allow-net --allow-env --allow-read supabase/functions/

docker rm -f supa-ci
```

## Adding a new SQL smoke test

1. Create `supabase/tests/<topic>.sql`.
2. Start with `\set ON_ERROR_STOP on`.
3. Wrap assertions in a `DO $$ ... $$` block that `RAISE EXCEPTION`s on
   drift. (See `seasons_rls.sql` for the pattern.)
4. Filenames starting with `_` are treated as helpers and skipped by the
   smoke runner — keep `_bootstrap.sql` and any future helpers prefixed.

## Extending the bootstrap

`supabase/tests/_bootstrap.sql` stubs Supabase-managed objects (`auth.*`,
`storage.*`, reserved roles, common extensions, the `supabase_realtime`
publication). If a new migration
depends on a Supabase object we haven't stubbed, extend the bootstrap
rather than skip the apply job. The stubs are CI-only and never run
against the real project.

## What this does NOT cover

- It does not run the full `supabase start` stack (PostgREST, GoTrue,
  Realtime). RLS policies are present but not exercised end-to-end.
- Edge function tests that require live Supabase credentials are skipped
  under CI guards — only deterministic, offline-safe tests run.
- Data migrations / backfills aren't verified against production-shape
  data; this is a structural check.
- It does not apply anything to the live project. Migrations merged via
  GitHub must be applied to production by hand — see "Applying database
  migrations to production" in `docs/OPERATIONS.md`.
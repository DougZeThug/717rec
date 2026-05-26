
# P1 — Local Supabase CI verification

Turn the existing (but manual-only) Supabase artifacts into an enforced CI gate so migration risk is verified, not hoped for.

## What exists today

- 296 migrations under `supabase/migrations/` — currently only validated when Lovable applies them to the real project.
- `supabase/tests/seasons_rls.sql` — `psql`-driven smoke script. Manual only.
- `supabase/functions/send-support-email/index.test.ts` — one Deno test. Not run in CI.
- Three edge functions: `capture-power-snapshots`, `send-support-email`, `submit-contact-request`.
- No `supabase db lint`, no `supabase db reset`, no Deno test job in any workflow.

## Change set (one focused PR)

Add **one new workflow** `.github/workflows/supabase-ci.yml` with three jobs that run on PRs touching `supabase/**` and on push to `main` (and a weekly cron):

### Job 1 — `db-lint`
- Install Supabase CLI (`supabase/setup-cli@v1`, pinned major).
- `supabase db lint --level warning` against `supabase/migrations/`.
- Fails on lint errors; warnings surfaced in step summary.

### Job 2 — `db-apply-and-smoke`
- Spins up a local Postgres via the official `postgres:15` service container (lighter than full `supabase start`, sufficient for migration apply + SQL smoke tests).
- Concatenates and applies every file in `supabase/migrations/*.sql` in lexical order via `psql`.
  - Skips Supabase-managed bootstrap (auth schema) by pre-creating minimal stubs (`auth.uid()` returning null, `auth.users` empty table, `extensions` schema with `uuid-ossp` + `pgcrypto`). Stubs live in a new `supabase/tests/_bootstrap.sql`.
- Runs every `supabase/tests/*.sql` smoke script with `psql -v ON_ERROR_STOP=1`.
- Fails CI if any migration errors or any smoke script raises.

### Job 3 — `edge-function-tests`
- Sets up Deno (`denoland/setup-deno@v1`).
- Runs `deno test --allow-net --allow-env --allow-read supabase/functions/` so every `*_test.ts` / `*.test.ts` is picked up (currently 1 test, future-proof for more).
- `.env.example` values are exported as `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` so tests that use the dotenv loader pattern run offline against safe placeholders. Tests that need real network are skipped via an env guard the existing test already respects, or via a new `SUPABASE_CI=1` env check we add only if needed.

## New files

- `.github/workflows/supabase-ci.yml` — three jobs above.
- `supabase/tests/_bootstrap.sql` — minimal `auth` / `extensions` stubs so migrations apply against a vanilla Postgres. Comments explain it is CI-only and not loaded by Supabase.
- `supabase/tests/migrations_apply.sql` — tiny driver that `\i`'s the bootstrap then verifies a handful of expected tables exist (`teams`, `matches`, `seasons`, `profiles`, `user_roles`-equivalent). Acts as a sanity check that the apply step actually ran every migration.
- `docs/SUPABASE_CI.md` — short doc explaining what each job does, how to reproduce locally, and the policy for adding new SQL smoke tests.

## Files updated

- `supabase/tests/README.md` — note that smoke scripts now run in CI; add the "add a new test" checklist.

## Explicitly not in scope

- No changes to migrations themselves.
- No changes to edge function runtime code.
- No frontend, services, hooks, or business logic.
- No `supabase start` (full stack) — too slow and brittle for PR CI; Postgres-only is enough for lint + apply + smoke.
- No pgTAP rewrite of existing tests; they stay as plain `psql` scripts.
- No mandatory tests for edge functions that need real Supabase creds — those stay skipped under the CI guard.

## Risk and mitigations

- **Migrations referencing Supabase-only objects** (auth schema, storage schema, vault) will need stubs. Bootstrap file covers `auth.uid()`, `auth.users`, `auth.role()`, `storage.objects`, `storage.buckets`. If an unexpected dependency surfaces during the first CI run, I'll extend the bootstrap rather than skip the job.
- **Long migration list (296 files)** may take a couple minutes to apply. Acceptable for a job that runs only when `supabase/**` changes.
- **False-positive lint warnings** — start with `--level warning` reporting only; promote to `error` in a follow-up once the baseline is clean.

## Validation

- Open the PR; confirm `supabase-ci` runs and all three jobs pass.
- Manually break a migration (locally) to confirm `db-apply-and-smoke` actually fails the job — then revert.
- Existing workflows (`test.yml`, `coverage-threshold.yml`, `security-audit.yml`, `secret-scan.yml`) are untouched.

## Suggested PR

**Title:** Add Supabase CI: db lint, migration apply, SQL smoke, edge function tests

**Description:** Wires the existing `supabase db lint`, migration apply, `supabase/tests/*.sql` smoke scripts, and Deno edge-function tests into GitHub Actions so migration risk is verified on every PR that touches `supabase/**`. Adds a minimal `_bootstrap.sql` so migrations apply against a vanilla Postgres service container. No migration, edge function, or app code changes.

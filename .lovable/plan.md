# Optimize Supabase CI Workflow for Faster PR Checks

## Current State

The `.github/workflows/supabase-ci.yml` has three jobs that run on PRs touching `supabase/**`:

- `db-lint` — downloads Supabase CLI each run
- `db-apply-and-smoke` — installs `postgresql-client` via apt (already present on runner), then spawns 296 individual `psql` processes to apply migrations one-by-one
- `edge-function-tests` — downloads Deno + re-fetches `deno.land/std`, `esm.sh/@supabase/supabase-js`, `esm.sh/zod` on every run

## Planned Changes

### 1. Cache Deno dependencies (edge-function-tests job)

Set `DENO_DIR: ~/.cache/deno` and add an `actions/cache@v4` step keyed on a hash of all edge function source files (`supabase/functions/**/*.ts`). This caches downloaded `deno.land/std` and `esm.sh` modules across runs.

### 2. Cache Supabase CLI (db-lint job)

Add `actions/cache@v4` for `~/.supabase` (or the CLI binary path) keyed on runner OS + a static version key. Avoids re-downloading the CLI on every run.

### 3. Remove redundant apt-get install (db-apply-and-smoke job)

`psql` is preinstalled on `ubuntu-latest` at `/bin/psql` — remove the `sudo apt-get update && sudo apt-get install -y postgresql-client` step entirely.

### 4. Batch migration application (db-apply-and-smoke job)

Instead of running `psql` 296 times (one per migration file), concatenate all migration files with `-- FILE: <path>` markers into a single temporary SQL file, then run `psql` once. Errors still surface with file attribution from the markers. This eliminates ~295 process spawns.

### 5. Batch smoke tests (db-apply-and-smoke job)

After bootstrap, concatenate all non-underscore SQL test files and run through a single `psql` invocation (keeping `ON_ERROR_STOP`). This is safe because each test is an independent `DO $$ ... $$` block.

### 6. Verify db-lint behavior

The `db-lint` job does `supabase init --force` followed by `supabase db lint --level warning --schema public`. Confirm whether this actually lints migrations or needs adjustment (it may need `supabase db start` or a different flag). If the current invocation is ineffective, fix it.

## What stays the same

- Job parallelism (all three jobs still run concurrently)
- Postgres service container setup
- Smoke test assertions and logic
- Edge function test commands and env vars
- Workflow triggers (`paths`, `branches`, `cron`)

## Expected impact

- Deno tests: ~15-30s saved per run after cache warm-up
- db-apply-and-smoke: ~30-60s saved (removing apt + batching 296 psql calls)
- db-lint: ~10-20s saved after CLI cache warm-up
- Overall PR check time should drop meaningfully on cached runs.

## Files to modify

- `.github/workflows/supabase-ci.yml` — all optimizations above

## Not in scope

- No changes to migrations, edge functions, or app code
- No changes to other workflows
- No changes to test logic or assertions
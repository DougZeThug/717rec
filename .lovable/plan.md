## Problem

`npm run e2e` runs `playwright test` with no project filter, so it executes **all** Playwright projects — including `real-backend`. In CI's `browser` job the `E2E_*` secrets aren't set, so `getRealBackendEnv()` returns `null`. But `real-backend.spec.ts` calls `createAdminClient(env as RealBackendEnv)` at the **top of the describe block**, which runs during test collection — *before* `test.skip(!env, ...)` has a chance to skip anything. Result: `TypeError: Cannot read properties of null (reading 'supabaseUrl')` and CI fails.

## Fix (two small changes)

**1. `e2e/real-backend.spec.ts` — move admin-client creation behind the skip guard.**

Right now `admin` and `createAdminClient` run at module/describe evaluation time. Restructure so nothing dereferences `env` unless `env` is truthy:

- Declare `let admin: SupabaseClient` (uninitialised).
- Initialise `admin = createAdminClient(realEnv)` inside `beforeAll`, after the skip has taken effect.
- Keep the `test.skip(!env, ...)` at the top of the describe so the whole block is skipped cleanly when secrets are missing.

This makes the spec safe to load in any CI job, with or without the `E2E_*` secrets.

**2. `package.json` — scope the default `e2e` script to the mocked project.**

Change:
```
"e2e": "playwright test"
```
to:
```
"e2e": "playwright test --project=chromium"
```

The `browser` CI job (and local `npm run e2e`) should only run the mocked-backend smoke tests. The real-backend project is already run separately by the `e2e-real-backend` job via `npx playwright test --project=real-backend`, so nothing else needs to change in CI.

Belt-and-suspenders: even if someone later runs `playwright test` with no filter, fix #1 ensures the real-backend spec skips gracefully instead of crashing.

## Files touched

- `e2e/real-backend.spec.ts` — lazy-init `admin` inside `beforeAll`
- `package.json` — narrow the `e2e` script to `--project=chromium`

## Verification

- `npm run e2e` locally runs only the chromium project (real-backend spec not loaded).
- With `E2E_*` unset, `npx playwright test` (no filter) now reports the real-backend spec as **skipped**, not failed.
- With `E2E_*` set, the `e2e-real-backend` job behaves exactly as before.

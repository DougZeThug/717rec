## Problem

The `e2e-real-backend` job is back in `.github/workflows/ci.yml` (lines 213–279) and now fails CI hard because none of the five `E2E_*` repo secrets are configured. That's the "missing=0 / exit $missing" guard reporting each secret as missing and exiting 1.

You previously asked to remove this job until a dedicated staging Supabase project exists. It needs to be removed again.

## Plan

1. **Delete the `e2e-real-backend` job** from `.github/workflows/ci.yml` (lines 213–279). Keep the E2E spec files and helpers in the repo so the job can be restored later.
2. **Leave `docs/E2E_REAL_BACKEND.md` and the PR-03 brief in place** as the runbook for when secrets/staging project are ready.
3. Optionally update `docs/OPERATIONS.md`'s CI table row for "E2E (real Supabase)" to note the job is not currently wired up.

No app code changes. No secret changes. This restores CI to green.

## How to verify

- Next CI run no longer contains an `E2E (real Supabase)` job.
- Other jobs unaffected.
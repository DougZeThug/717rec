# Real-backend E2E smoke

`e2e/real-backend.spec.ts` is the only test that runs against a live Supabase
project. Everything else in `e2e/` mocks the network. This spec covers the
golden path: **login → view schedule → submit a score report**, and asserts
that the submission actually lands in `score_submissions`.

## Target project

Use a dedicated Supabase branch or a throwaway project — **never** production
(`wcitdamvochthvxvtxyb`). The schema must match main (run all migrations).

## Required secrets

Add these to GitHub Actions repo secrets (and to your local `.env.e2e` when
running locally):

| Name | Purpose |
| --- | --- |
| `E2E_SUPABASE_URL` | Staging project URL |
| `E2E_SUPABASE_ANON_KEY` | Publishable / anon key (baked into the browser build) |
| `E2E_SUPABASE_SERVICE_ROLE_KEY` | Service role — used **only** by the Node seed helper, never shipped to the browser |
| `E2E_TEST_USER_EMAIL` | Login account |
| `E2E_TEST_USER_PASSWORD` | Login password. Rotated onto the user on each run. |

If any secret is missing the spec is skipped, and CI passes vacuously — treat a
skipped run as a red flag.

## Running locally

```bash
set -a; source .env.e2e; set +a
npx playwright test --project=real-backend
```

## What the spec does per run

1. `ensureTestUser` — idempotently creates or resets the shared test user.
2. `seedPendingMatch` — inserts two throwaway `teams` and one pending `matches`
   row, named with a random suffix.
3. Drives the browser through login, `/schedule`, and the Report dialog.
4. Queries `score_submissions` with the service role to confirm the row landed.
5. `cleanupSeededMatch` — deletes the submission, match, and both teams by id.

Test data is namespaced with an `E2E ` prefix and a random suffix, so a failed
run that skips cleanup can be swept manually:

```sql
delete from score_submissions where submitter_name = 'E2E Reporter';
delete from matches where location = 'E2E Court';
delete from teams where name like 'E2E Alpha %' or name like 'E2E Beta %';
```

## CI

Job: `e2e-real-backend` in `.github/workflows/ci.yml`. Mark it required in
branch protection to block merges on failure. The HTML report is uploaded as
`playwright-report-real-backend` on every run.
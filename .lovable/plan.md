## Goal

Add one Playwright E2E spec that exercises 2–3 golden paths against a **real Supabase project** (staging/branch), and make it a required CI check. Existing `e2e/*.spec.ts` files mock every `/auth/v1/`, `/rest/v1/`, and `/functions/v1/` call — so nothing today proves the app works against a real database.

## Scope (golden paths)

1. **Login** — email/password sign-in via `supabase.auth.signInWithPassword` against the staging project, land on `/` authenticated.
2. **View schedule** — navigate to `/schedule`, assert real matches render (row count > 0, no error toast, no console errors).
3. **Submit score** — open the Report dialog on a seeded pending match, submit a valid report, assert success toast and that the row lands in `score_submissions`.

Non-goals: admin flows, playoffs, mass entry, visual regressions. Those stay on the mocked suites.

## Approach

### 1. Staging Supabase target
- Use a dedicated **Supabase branch** (or a second project) as the E2E target — never point at prod (`wcitdamvochthvxvtxyb`).
- New GitHub Actions secrets: `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_SUPABASE_SERVICE_ROLE_KEY`, `E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD`.
- Service-role key is used **only** by the seed/teardown script in CI, never shipped to the browser.

### 2. New spec file
- `e2e/real-backend.spec.ts`, tagged via `test.describe('@real-backend', ...)`.
- No `page.route(...)` interceptors — real network.
- `test.skip(!process.env.E2E_SUPABASE_URL, 'real-backend creds not configured')` so local `npm run test:e2e` still works for contributors without secrets.

### 3. Seed / teardown helper
- `e2e/helpers/realBackend.ts`: creates a service-role Supabase client, ensures the test user exists (`auth.admin.createUser` idempotent), inserts one pending match owned by two throwaway teams, returns their ids. `test.afterEach` deletes the seeded rows (`score_submissions`, `matches`, `teams`) by id.
- Test data is namespaced with an `e2e-` id prefix so a failed run can be cleaned up manually.

### 4. Playwright config
- Second project in `playwright.config.ts` named `real-backend` that only picks up `real-backend.spec.ts` and injects the E2E env vars into `webServer.env` so Vite builds with the staging Supabase URL/anon key for this run.
- Existing `chromium` project keeps running the mocked specs unchanged.

### 5. CI wiring (`.github/workflows/ci.yml`)
- New job `e2e-real-backend`: needs the existing build/lint job, runs `npx playwright test --project=real-backend`, uploads the HTML report artifact on failure.
- Marked **required** in branch protection so a red run blocks merge.
- Runs on `pull_request` and `push` to `main`. Concurrency group per branch to avoid two runs stomping on the same seeded rows.

## Technical details

Files added:
- `e2e/real-backend.spec.ts`
- `e2e/helpers/realBackend.ts`
- `.github/workflows/ci.yml` — new job only, existing jobs untouched
- `playwright.config.ts` — add second project
- `docs/E2E_REAL_BACKEND.md` — short runbook: which secrets, how to reset the staging project, how to run locally with a `.env.e2e`

No app/source code changes. No migrations. No changes to the mocked specs.

## Verification

- Run `npx playwright test --project=real-backend` locally against the staging project — all three paths green.
- Force a failure (wrong password) and confirm the CI job goes red and the HTML report artifact uploads.
- Confirm the mocked `smoke.spec.ts` / `score-submission.spec.ts` still pass unchanged under the default `chromium` project.

## Open questions

1. Do you already have a staging/branch Supabase project we should target, or should the plan include spinning one up?
2. OK to make the job **blocking** on day one, or land it as non-blocking for a week first to shake out flakes?

# Add E2E smoke testing with Playwright

Set up Playwright as the E2E framework, add one smoke spec that loads the app and verifies the main navigation shell renders, wire it into GitHub Actions as a non-blocking check, and document the workflow in `TESTING.md`.

## 1. Install Playwright

Add dev dependencies via npm (repo uses npm, not pnpm/yarn, with `legacy-peer-deps=true`):

- `@playwright/test`

Browsers (`chromium` only for the smoke pass) will be installed via `npx playwright install --with-deps chromium` in CI and via a documented local command.

## 2. Project files

- **`playwright.config.ts`** (repo root)
  - `testDir: './e2e'`
  - `testMatch: '**/*.spec.ts'` so it does not collide with Vitest's `**/__tests__/**/*.{test,spec}.*`
  - `webServer`: runs `npm run dev`, reuses an existing server locally, waits on `http://localhost:8080`
  - `use.baseURL: 'http://localhost:8080'`
  - One project: `chromium` (desktop viewport)
  - `reporter: [['list'], ['html', { open: 'never' }]]`
  - `retries: process.env.CI ? 2 : 0`

- **`e2e/smoke.spec.ts`** — single smoke test
  - Navigate to `/`
  - Assert no console errors during initial load
  - Assert the main shell is present: brand link (`717Rec`), and the primary nav links (Home, Teams, Schedule, Standings, Playoffs) are visible via `getByRole('link', { name: ... })`
  - Click `Teams` and assert URL becomes `/teams` and the teams route renders (heading or known landmark)

- **Exclude `e2e/` from Vitest** — update `vitest.config.ts` `test.exclude` to add `'e2e/**'` so Vitest's `**/*.spec.ts` glob does not pick up Playwright specs.

- **`.gitignore`** — append:
  - `/test-results/`
  - `/playwright-report/`
  - `/playwright/.cache/`

## 3. npm scripts (`package.json`)

Add:

```
"e2e": "playwright test",
"e2e:ui": "playwright test --ui",
"e2e:install": "playwright install --with-deps chromium",
"e2e:report": "playwright show-report"
```

## 4. GitHub Actions — non-blocking

New workflow **`.github/workflows/e2e.yml`**:

- Triggers: `pull_request` and `push` to `main`/`master`
- Job `e2e` on `ubuntu-latest`
- `continue-on-error: true` at the job level so failures do **not** block PR merges initially
- Steps:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` with Node 20 + npm cache
  3. `npm ci`
  4. `npx playwright install --with-deps chromium`
  5. `npm run e2e`
     - Env: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from repo secrets so `npm run dev` boots
  6. `actions/upload-artifact@v4` (with `if: always()`) to upload `playwright-report/` and `test-results/`

Workflow name `E2E (smoke)` so the non-blocking status is clearly distinguishable from `Test & Build`.

## 5. Docs

Update **`TESTING.md`** (or create at repo root if missing) with a new "End-to-end tests (Playwright)" section:

- One-time setup: `npm run e2e:install`
- Run smoke locally: `npm run e2e` (auto-starts dev server on :8080)
- Interactive mode: `npm run e2e:ui`
- View last HTML report: `npm run e2e:report`
- Note: spec lives in `e2e/`, separate from Vitest (`src/**/__tests__/**`)
- Note that the CI job is currently **non-blocking** while the suite stabilizes, and how to flip it to blocking later (remove `continue-on-error: true`)

Also add a one-line pointer in `README.md` under the existing testing commands section linking to the new TESTING.md section.

## Out of scope

- Authenticated flows / Supabase session seeding (smoke is unauthenticated public shell only)
- Multi-browser matrix (Firefox/WebKit) — chromium only for now
- Visual regression / screenshot diffing
- Making the CI check blocking (explicitly deferred per the request)

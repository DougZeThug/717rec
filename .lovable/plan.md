# PR 4.4 — Informational a11y / bundle-size / Lighthouse gates

Goal: land three new quality signals in CI **without** blocking merges, so we can collect a baseline and tighten later. All three run on PRs and `main`, each in its own workflow with `continue-on-error: true`.

## 1. Dev dependencies

Install (respecting `.npmrc` `legacy-peer-deps=true`, which `npm install` already honors):

- `@axe-core/playwright`
- `size-limit`
- `@size-limit/file`
- `@lhci/cli`

All added to `devDependencies`. Run `npm install` to refresh `package-lock.json`.

## 2. Accessibility — axe via Playwright

**New file: `e2e/a11y.spec.ts`**

- Uses existing `playwright.config.ts` (reuses dev server on port 8080, Chromium project).
- Iterates a short list of public routes: `/`, `/teams`, `/stats`, `/history`, `/playoffs`, `/help`.
- For each route: `page.goto`, wait for `networkidle`, run `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze()`, then `expect(results.violations).toEqual([])`.
- Failures are real assertion failures but the workflow is non-blocking, so they surface as informational.

**New workflow: `.github/workflows/a11y.yml`**

- Triggers: `push` and `pull_request` on `main`/`master`.
- `continue-on-error: true` on the job.
- Steps mirror `e2e.yml`: checkout → setup Node 20 (npm cache) → `npm ci` → `npm run e2e:install` → `npx playwright test e2e/a11y.spec.ts`.
- Passes `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` from secrets like `e2e.yml`.
- Uploads `playwright-report/` artifact on failure.
- Top-of-file comment: *informational — remove `continue-on-error` to make this a required gate.*
- Kept separate from `e2e.yml` so PR 4.3 can promote E2E to required without dragging a11y along.

## 3. Bundle-size budget — size-limit

**New file: `.size-limit.json`**

Seeded from a measured `npm run build` of current `dist/assets/*.js`, with ~15% headroom. Shape:

```json
[
  {
    "name": "All JS chunks (gzip)",
    "path": "dist/assets/*.js",
    "limit": "<measured-total + headroom> KB",
    "gzip": true
  },
  {
    "name": "Main entry",
    "path": "dist/assets/index-*.js",
    "limit": "<measured + headroom> KB",
    "gzip": true
  }
]
```

Uses `@size-limit/file` preset for deterministic gzip measurement (no bundler reanalysis — just measures the already-built files Vite emitted, which matches what end users download).

**`package.json` script:** add `"size": "size-limit"`.

**New workflow: `.github/workflows/bundle-size.yml`**

- Triggers: `push` and `pull_request` on `main`/`master`.
- `continue-on-error: true`.
- Steps: checkout → setup Node 20 → `npm ci` → `npm run build` (with `VITE_SUPABASE_*` secrets) → `npm run size`.
- Top-of-file comment: *informational — remove `continue-on-error` to enforce the budget.*

## 4. Lighthouse — LHCI

**New file: `lighthouserc.json`**

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "numberOfRuns": 1,
      "url": ["http://localhost/index.html"]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.7 }],
        "categories:accessibility": ["warn", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.9 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

`staticDistDir` makes LHCI serve `dist/` itself — no separate `npm run preview` / port juggling. All assertions are `warn` so the run only fails on hard collection errors.

**New workflow: `.github/workflows/lighthouse.yml`**

- Triggers: `push` and `pull_request` on `main`/`master`.
- `continue-on-error: true`.
- Steps: checkout → setup Node 20 → `npm ci` → `npm run build` (with `VITE_SUPABASE_*` secrets) → `npx lhci autorun`.
- Uploads `.lighthouseci/` report directory as artifact.
- Top-of-file comment: *informational — remove `continue-on-error` and raise `lighthouserc.json` asserts from `warn` to `error` to make this a required gate.*

## 5. Verification

- `npm install` succeeds, lockfile updates cleanly.
- `npm run build && npm run size` passes locally with the seeded budgets.
- `npx lhci autorun` succeeds locally against `./dist`.
- `npx playwright test e2e/a11y.spec.ts` runs (violations are acceptable for the first run — they appear as test failures inside the non-blocking job).
- `npm run lint`, `npm run typecheck`, `npm run test:coverage:ci` unaffected.
- After PR opens: `test`, `lint`, `coverage-threshold` remain required and green; new `a11y`, `bundle-size`, `lighthouse` jobs appear and are non-blocking regardless of outcome.

## 6. Commit

Single commit: `ci: add axe a11y, bundle-size budget, and Lighthouse (informational)`

## Out of scope (deferred)

- Tightening any of the three to required gates — explicitly left for later PRs once a baseline of runs exists.
- Per-route Lighthouse runs against a live preview URL (current setup uses the static `dist/`).
- PR 4.3 E2E promotion work — handled separately so this PR stays purely additive.

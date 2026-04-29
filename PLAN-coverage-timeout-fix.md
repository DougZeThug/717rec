# Plan: Fix coverage timeout / baseline-refresh failure

> Working branch: `claude/plan-coverage-timeout-fix-xk7UO`
> Delete this file once the work is merged.

## 1. What broke and why (in plain language)

The documented "refresh baseline" path is:

```
npm run test:coverage:refresh-docs
  → npm run test:coverage     (writes coverage/coverage-summary.json)
  → node tools/sync-testing-baseline.mjs   (rewrites the table in TESTING.md)
```

The first half never finished inside the environment's runtime budget, so
`coverage/coverage-summary.json` was never written, so the second half had
nothing to read, so `TESTING.md` was not updated and no commit was produced.

Two underlying causes, only one of which is "the timeout":

### Cause A — coverage runs are slower than the budget

- `package.json:18` defines:
  `test:coverage:ci = timeout 10m env CI=true VITEST_CI_COVERAGE=1 COVERAGE_CRITICAL_ONLY=1 vitest run --coverage --maxWorkers=1`
- The 10-minute wall is enforced by GNU `timeout`, which is exactly what
  produced the `exit code 124` the user observed.
- `--maxWorkers=1` is intentional (vitest stalls under v8 coverage on this
  repo when parallel) but multiplies wall time across 241 test files.

### Cause B — `COVERAGE_CRITICAL_ONLY=1` is a dead flag

- The flag is set in two scripts (`test:coverage:ci`,
  `test:coverage:deepsource`).
- It is never read by `vitest.config.ts`, by `tools/*`, or anywhere in
  `src/`. `grep -r COVERAGE_CRITICAL_ONLY` returns only the two
  package.json lines.
- The intent (based on its name and the existing `VITEST_CI_COVERAGE`
  branch in `vitest.config.ts:23-25` that already narrows coverage
  *reporting* to `services/hooks/utils`) was clearly to also narrow
  *test execution* to those folders so CI runs faster.
- Because the flag is dead, CI today still executes every page,
  component, and integration test even though their coverage is thrown
  away — that is the dominant source of wall-clock cost.

### Cause C — at least one failing test in `Contact.test.tsx`

- The user observed a Contact page test failure before the timeout
  fired. That is independent of the timeout — vitest does not stop on
  first failure, but the failure should not be ignored.
- Likely culprit: the bespoke `vi.mock('react-hook-form', ...)` returns
  a `useForm` stub missing several fields the component (or its
  zodResolver wiring) reaches for. Needs reproduction before fixing.

## 2. Goal of the fix

After this change is merged, a developer (or this agent in this
environment) should be able to run **one command** that:

1. Completes within ~6 minutes on a cold cache.
2. Writes `coverage/coverage-summary.json`.
3. Updates the baseline block in `TESTING.md`.
4. Leaves a clean working tree apart from the doc update.

And: `Contact.test.tsx` should pass.

## 3. Step-by-step plan

Each step is a separate commit. Stop and report after each step; do not
batch.

### Step 1 — Reproduce and fix the Contact test failure (no coverage)

**Why first:** if a test is broken, fixing the timeout still produces a
red bar. We want a clean baseline.

1. Run only that file, no coverage, with a short timeout:
   `timeout 60s npx vitest run src/pages/__tests__/Contact.test.tsx --reporter=verbose`
2. Read the failure message. Two likely shapes:
   - `useForm` mock is missing a property the component dereferences
     (e.g. `formState`, `getFieldState`, `_formState`). Fix by adding
     the missing fields to the mock returned object.
   - `findByText('Sending...')` races because the mocked
     `submitContactRequest` resolves before React commits the
     loading-state render. Fix by widening the mock's resolution delay
     or by asserting on the disabled button instead.
3. Commit with message `fix(test): repair Contact page test mocks`.
4. Verify by re-running the single-file command above.

**Out of scope:** rewriting the test to use the real `react-hook-form`.
The test already mocks the form library on purpose to avoid Radix /
async resolver flake; keep that shape.

### Step 2 — Wire up `COVERAGE_CRITICAL_ONLY=1` so it actually narrows test execution

**Why:** this is the single biggest wall-time win. `services/hooks/utils`
is where the enforced thresholds live, so running pages/components
during the CI-gate coverage run is wasted work.

1. In `vitest.config.ts`, alongside the existing `isCiCoverage` /
   `coverageInclude` block, add:

   ```ts
   const isCriticalOnly = process.env.COVERAGE_CRITICAL_ONLY === '1';
   const testInclude = isCriticalOnly
     ? [
         'src/services/**/__tests__/**/*.{test,spec}.{ts,tsx}',
         'src/hooks/**/__tests__/**/*.{test,spec}.{ts,tsx}',
         'src/utils/**/__tests__/**/*.{test,spec}.{ts,tsx}',
         'tests/services/**/*.{test,spec}.{ts,tsx}',
         'tests/hooks/**/*.{test,spec}.{ts,tsx}',
         'tests/utils/**/*.{test,spec}.{ts,tsx}',
       ]
     : [
         '**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mjs,cts,tsx}',
         '**/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mjs,cts,tsx}',
       ];
   ```

   and use `testInclude` for `test.include`.

2. Verify the integration-test layout under `tests/` first
   (`ls tests/`). Adjust the critical-only globs to match the actual
   subdirectory names — do not invent paths.

3. Sanity-run before committing:
   ```
   timeout 5m env CI=true VITEST_CI_COVERAGE=1 COVERAGE_CRITICAL_ONLY=1 \
     vitest run --coverage --maxWorkers=1 --reporter=default
   ```
   Expected: completes well under 5 min, prints `coverage-summary.json`
   path, all selected tests pass.

4. Commit: `perf(coverage): make COVERAGE_CRITICAL_ONLY narrow test execution`.

**Risk:** the CI gate now skips page/component tests. Mitigation: the
existing `test.yml` workflow still runs the full suite without
coverage, so regressions in those areas are still caught — verify this
by reading `.github/workflows/test.yml` in this step before committing.
If `test.yml` does not run the full suite, this step must also leave a
non-coverage full-suite job in place.

### Step 3 — Add a slim "refresh baseline" path that fits in 6 minutes

**Why:** `test:coverage:refresh-docs` currently chains
`test:coverage` (no critical-only flag, no serial pin) — that is the
slowest possible variant. Step 2 alone won't help it.

1. Edit `package.json:24` to:
   ```
   "test:coverage:refresh-docs": "npm run test:coverage:ci && npm run test:coverage:sync-docs"
   ```
   Rationale: `test:coverage:ci` already produces
   `coverage/coverage-summary.json` (the `json-summary` reporter is
   active under `VITEST_CI_COVERAGE=1`), and after Step 2 it will run
   in the budget.

2. Update `TESTING.md` lines 11-19 so the script-listing block matches
   the new definition. The "Single source of truth" note on line 21
   makes this required.

3. Commit:
   `chore(coverage): point refresh-docs at the bounded ci coverage run`.

### Step 4 — Regenerate the baseline and update TESTING.md

1. `rm -rf coverage`
2. `npm run test:coverage:refresh-docs`
3. Inspect the diff: should be only the `Last measured:` date and the
   four metric rows under `## Current baseline`.
4. If any global threshold in `vitest.config.ts:58-62` is now *below*
   measured coverage by a meaningful margin, **do not** raise it in
   this PR — TESTING.md's "ratchet upward in a dedicated PR" policy
   forbids it.
5. Commit: `docs(testing): refresh coverage baseline`.

### Step 5 — Push and report

1. `git push -u origin claude/plan-coverage-timeout-fix-xk7UO`
2. Do **not** open a PR (per task rules — only on explicit request).
3. Report to the user: the four commits, the new wall time, the new
   baseline numbers, and any threshold headroom that could be tightened
   in a follow-up PR.

## 4. Things explicitly out of scope

- Migrating off `--maxWorkers=1`. The TESTING.md troubleshooting
  section says serial is intentionally chosen for stability.
- Replacing v8 coverage with istanbul.
- Raising any coverage threshold.
- Re-architecting the `react-hook-form` mocking pattern across the test
  suite.
- Touching `test:coverage:deepsource` runtime — that path has its own
  15-minute budget and a different reporter set; only revisit if Step 2
  visibly breaks it.

## 5. Verification checklist (run before declaring done)

- [ ] `npx vitest run src/pages/__tests__/Contact.test.tsx` is green.
- [ ] `npm run test` is green (full suite, no coverage).
- [ ] `time npm run test:coverage:ci` completes in under 6 minutes and
      exits 0.
- [ ] `coverage/coverage-summary.json` exists after the run.
- [ ] `npm run test:coverage:refresh-docs` updates only the four
      metric rows + date in `TESTING.md`.
- [ ] `git status` shows only intended files.

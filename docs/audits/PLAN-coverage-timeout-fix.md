# Plan: Fix coverage timeout / baseline-refresh failure

> Working branch: `claude/plan-coverage-timeout-fix-xk7UO`
> Delete this file once the work is merged.

## Goal

Keep **full-codebase coverage** (whole `src/**`, no scope reduction).
Make `npm run test:coverage` reliably finish in a reasonable wall time
in Codex CLI and CI. Today it runs >40 minutes and sometimes never
finishes.

## 1. Diagnosis

### 1a. The dominant cost is per-file overhead × 241 files × serial workers

Vitest defaults to `isolate: true` and runs each test file in a fresh
module context. The current scripts also pin `--maxWorkers=1`. Combined:

- 241 test files
- Each file re-loads React, testing-library, the Supabase client
  (`src/integrations/supabase/client.ts:18-21` instantiates
  `createClient` at module load), Sentry transitively, plus the
  component-under-test and its dependency tree.
- v8 coverage re-instruments everything on each fresh module graph.
- All of this runs in a single thread.

A conservative 5-10 seconds of module-init per file × 241 files =
**20-40 minutes of setup before a single assertion runs.** That
matches the reported >40 min wall time. Codex CLI's tighter CPU
budget pushes runs that "work fine on a laptop" over the cliff.

This is a **structural** problem with how coverage is configured, not
a single bad test.

### 1b. Smaller contributors found in the static sweep

These add seconds, not minutes — fix them for hygiene, not as the
primary lever:

- Real-timer waits in 5 remaining places (Contact.test.tsx:92 was fixed in commit 92802236):
  - `src/hooks/message-board/__tests__/useMessageBoard.test.ts:118` — 350ms
  - `src/hooks/useAutoSchedule/__tests__/useAutoScheduleState.test.ts:59,80,100` — 350ms each
  - `src/hooks/auth/__tests__/useAuth.test.ts:295` — 50ms
  Total ≈ 1.3s. Not material to the 40 min problem.

- `src/services/__tests__/FailedBadgeOperationsService.test.ts:28` —
  `vi.useFakeTimers()` in `beforeEach` with no matching
  `afterEach(() => vi.useRealTimers())`. **Not a cross-file leak**
  (`isolate: true` blocks that), but worth tidying. Not a runtime
  driver.

- vitest.config.ts has no explicit `testTimeout` / `hookTimeout` /
  `teardownTimeout`. A truly hung test silently waits the default 10s
  before vitest moves on. Setting these surfaces hangs faster but
  doesn't speed up healthy runs.

### 1c. What is *not* the problem

- No `.only` / `fdescribe` / `fit` lockups (sweep confirmed clean).
- No module-level `setInterval` or top-level `await` in `src/**` that
  would prevent vitest from exiting (Sentry/analytics timeouts are
  gated behind `initSentry()` / `initAnalytics()` which test entry
  points don't call).
- No unmocked `recharts` / `framer-motion` / `brackets-viewer` /
  `exceljs` in tests — sweep confirmed those are mocked everywhere
  they appear.

### 1d. What the user actually saw in their last run

- `timeout 12m npm run test:coverage` → exit 124 (GNU timeout fired).
- `npm run test:coverage:ci` → exit 124 (`timeout 10m` fired) **and**
  flagged at least one failing test in `Contact.test.tsx`. Failure
  cause not yet reproduced — separate problem from the timeout.
- `coverage/coverage-summary.json` was never written, so
  `tools/sync-testing-baseline.mjs` had nothing to read and
  `TESTING.md` was not updated.

## 2. Fix strategy

The big lever is **stop re-loading the module graph 241 times.** Two
ways to do that, both supported by vitest:

- **Drop `--maxWorkers=1`** — let multiple workers run in parallel.
  Each worker still pays the module-init cost, but in parallel.
  Speedup limited by CPU count.
- **Set `isolate: false`** — within a worker, reuse the module graph
  across files. Eliminates the 241× cost almost entirely. Requires
  hygienic tests (no module-level state mutation that bleeds between
  files); the sweep didn't find anything obviously hostile to this.

We will introduce both **carefully** behind one explicit env flag so
the existing CI behaviour isn't disrupted, then measure before
committing.

The TESTING.md troubleshooting block ("If `--maxWorkers=1` is stable,
keep serial coverage in CI for reliability") was written based on
*then-current* flakiness; it is allowed to be revisited if we
empirically show the new config is stable. The change must be
documented in that section either way.

## 3. Step-by-step plan

Each numbered step is a separate commit. Stop and report after each;
don't batch.

### Step 1 — Reproduce and fix the Contact test failure ✅ COMPLETED

Independent of timeout work; do first so a clean coverage run is
possible.

1. `timeout 60s npx vitest run src/pages/__tests__/Contact.test.tsx --reporter=verbose`
2. Read the failure. Probable cause from the sweep: the 50ms real
   `setTimeout` in the loading-state test races React commits. Fix:
   either bump the delay, switch to fake timers + `act`, or assert
   on the disabled button instead of the spinner text.
3. Commit: `fix(test): repair Contact page test mocks`.

**Completed in commit 92802236ea07160685ddabd15bff30ee551a2ba6**: Replaced the 50ms setTimeout with a never-resolving promise and changed assertion to check disabled button state instead of loading text.

### Step 2 — Set hard hook/test timeouts so future hangs surface fast

Pure observability change; no runtime impact on healthy runs.

1. In `vitest.config.ts`, inside `test:`, add:
   ```ts
   testTimeout: 15_000,
   hookTimeout: 15_000,
   teardownTimeout: 10_000,
   ```
2. Run `npm test` (no coverage). Expect green; if anything turns red,
   that test was already silently hanging — note it for follow-up but
   don't widen timeouts to paper over it.
3. Commit: `test: add explicit timeouts to surface hangs`.

### Step 3 — Tidy the small real-timer / fake-timer hygiene issues

Small wall-time gain, larger hygiene gain. One commit, five edits (Contact.test.tsx already fixed).

1. Convert each of these to `vi.useFakeTimers()` + advance, **or**
   shorten the wait to <10ms if the test is genuinely about wall time:
   - `src/hooks/message-board/__tests__/useMessageBoard.test.ts:118`
   - `src/hooks/useAutoSchedule/__tests__/useAutoScheduleState.test.ts:59,80,100`
   - `src/hooks/auth/__tests__/useAuth.test.ts:295`
   - ~~`src/pages/__tests__/Contact.test.tsx:92`~~ (already resolved in Step 1)
2. In `src/services/__tests__/FailedBadgeOperationsService.test.ts`,
   add `afterEach(() => vi.useRealTimers())`.
3. Commit: `test: remove real-timer waits and add fake-timer cleanup`.

### Step 4 — Measure the baseline before changing the worker model

Need an honest "before" number to know if Step 5 helped.

1. `rm -rf coverage`
2. `time npm run test:coverage 2>&1 | tee /tmp/cov-before.log`
   (no GNU `timeout` wrapper — let it run as long as it needs).
3. Record total elapsed and also note: did `coverage/coverage-summary.json`
   appear? Was the run green?
4. **If the run still doesn't finish at all** (e.g. hangs past 60 min),
   stop and run `npm run test:coverage:triage` instead — that script
   logs the last completed suite, which would point at one specific
   bad file we missed in the static sweep. Investigate that file
   before continuing.
5. No code change; record the number in the commit message of Step 5.

### Step 5 — Reduce per-file overhead via parallel + non-isolated coverage

The big lever. Behind a new env flag so it doesn't disturb anything
else.

1. In `vitest.config.ts`:
   ```ts
   const isFastCoverage = process.env.VITEST_FAST_COVERAGE === '1';
   ```
   In the returned `test:` block, when `isFastCoverage`:
   - `pool: 'forks'`
   - `poolOptions: { forks: { maxForks: <N>, singleFork: false } }`
     where N is min(4, available cores). Choose 4 — Codex containers
     and GH Actions ubuntu-latest both have ≥4 vCPU.
   - `isolate: false`
   - `fileParallelism: true`

2. Add a new script in `package.json`:
   ```
   "test:coverage:fast": "env VITEST_LIGHT_COVERAGE=1 VITEST_FAST_COVERAGE=1 vitest run --coverage"
   ```
   Do **not** modify `test:coverage` itself yet. We earn confidence
   first.

3. Run it locally / in Codex:
   ```
   rm -rf coverage
   time npm run test:coverage:fast
   ```
   - If green and `coverage-summary.json` is written: continue.
   - If any test fails specifically when `isolate: false` (most
     common: a test that mutates a module-level variable expected to
     be reset): record the file, then either fix the test (preferred)
     or fall back to `isolate: true` and rely on parallelism alone.
     With 4 forks and isolate: true, expect ~4× speedup; with
     isolate: false, expect 5-10×.

4. Commit: `perf(coverage): add fast-coverage path with forks + non-isolated worker model (before Nm → after Mm)`,
   filling in measured times.

### Step 6 — Make `test:coverage` and `refresh-docs` use the fast path

Once Step 5 is proven stable.

1. In `package.json`:
   - Update `test:coverage` to set `VITEST_FAST_COVERAGE=1` alongside
     `VITEST_LIGHT_COVERAGE=1`.
   - Update `test:coverage:ci`: keep its `timeout 10m` wrapper (now
     comfortably enough), keep `--maxWorkers=1` removed, set
     `VITEST_FAST_COVERAGE=1`.
   - Leave `test:coverage:debug` and `test:coverage:triage` alone —
     those exist precisely for the "go back to slow + serial to find a
     hang" case.
2. Update the script-listing block in `TESTING.md` lines 11-19 to
   match (the doc declares scripts authoritative).
3. Update the troubleshooting section (lines 27-50) to reflect the
   new defaults: serial is now the *fallback*, not the production
   path.
4. Commit:
   `chore(coverage): make fast-coverage the default for test:coverage and ci`.

### Step 7 — Refresh the baseline

1. `rm -rf coverage`
2. `npm run test:coverage:refresh-docs` (today this chains
   `test:coverage` then `tools/sync-testing-baseline.mjs`; after Step
   6, that's the fast path).
3. Diff `TESTING.md`: should be only the date row + four metric rows
   under `## Current baseline`.
4. **Per TESTING.md policy, do not raise any threshold in
   `vitest.config.ts:58-62` even if there is headroom** — that's a
   dedicated PR.
5. Commit: `docs(testing): refresh coverage baseline`.

### Step 8 — Push, delete plan file, report

1. Delete `PLAN-coverage-timeout-fix.md`.
2. `git push -u origin claude/plan-coverage-timeout-fix-xk7UO`.
3. Do **not** open a PR (per task rules).
4. Report: each commit's measured wall time, the new baseline numbers,
   and any tests that needed adjustment to be safe under
   `isolate: false`.

## 4. Things explicitly out of scope

- Narrowing what files coverage measures.
- Wiring up the dead `COVERAGE_CRITICAL_ONLY=1` flag.
- Raising any coverage threshold.
- Rewriting `react-hook-form` mocking patterns beyond the Contact fix.
- Migrating off v8 coverage to istanbul.
- Refactoring the Supabase client to lazy-init (would help, but
  ripples through the codebase — out of scope here).

## 5. Decision points to confirm with the user before starting

1. **Step 5 risk tolerance** — `isolate: false` is the lever that
   unlocks order-of-magnitude speedup, but it requires tests to not
   mutate module-level state across files. The static sweep didn't
   find anything obviously hostile, but only running it tells us for
   sure. Are you OK with a step that may surface a handful of test
   fixes as a side effect?

2. **Worker count** — recommend `maxForks: 4`. If Codex CLI runs on a
   container with fewer vCPUs, vitest will still spawn that many but
   they'll time-share. If you have a sense of Codex's CPU budget, tell
   me and I'll tune it.

3. **`test:coverage` default change in Step 6** — comfortable with
   making the fast path the default, with the slow-serial path
   preserved as `test:coverage:debug` / `:triage`?

## 6. Verification checklist

- [x] `npx vitest run src/pages/__tests__/Contact.test.tsx` is green.
- [ ] `npm run test` is green.
- [ ] `time npm run test:coverage:fast` finishes well under 10 min and
      writes `coverage/coverage-summary.json`.
- [ ] `npm run test:coverage:refresh-docs` produces a TESTING.md diff
      limited to the date row + four metric rows.
- [ ] No flake reproducibly tied to `isolate: false` (run the fast
      path twice and compare).
- [ ] `git status` shows only intended files.

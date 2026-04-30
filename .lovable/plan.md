## Goal
Make coverage runs finish reliably in Claude Code/Codex so `TESTING.md` and `coverage-baseline.txt` can be refreshed again.

## What’s most likely causing the timeout
This does not look like one obviously stuck test. It looks like the coverage run is doing too much work in the slowest possible mode.

Key facts from the repo:
- There are 245 test files now.
- Local coverage is set to measure almost all of `src/**`, which is about 1091 source files after exclusions.
- CI coverage narrows the measured files to `src/services`, `src/hooks`, and `src/utils`, but that still means about 433 source files.
- The CI command forces single-worker mode: `--maxWorkers=1` with a hard `timeout 10m`.
- The saved earlier baseline shows a full coverage run taking 494.68s, and most of that time was not actual assertions:
  - tests: 26.16s
  - environment: 256.02s
  - imports: 68.46s
  - setup: 46.87s

Plain English: coverage is spending far more time repeatedly booting the test environment and loading modules than it is actually running test logic. In slower CLI containers, that overhead is enough to push the run past the timeout.

There are a few small timer-based waits in tests, but together they only add around 1.5 seconds, so they are cleanup work, not the main cause.

## Plan

### 1) Reproduce the failure with the exact slow path
Run the existing coverage commands that match Claude/Codex and CI behavior so we can capture a real before/after measurement.

What to run:
- `npm run test:coverage`
- `npm run test:coverage:ci`
- if needed, `npm run test:coverage:triage`

Expected result:
- confirm whether the failure is a pure timeout, or timeout plus one flaky/failing test
- record the real wall time and the last completed suite if it stalls

### 2) Fix any single failing test that blocks a clean run
Before changing performance settings, repair any specific test failure that appears during coverage.

Most likely candidates already visible in the codebase:
- `src/pages/__tests__/Contact.test.tsx`
- a few tests using real `setTimeout(...)` waits
- fake timer cleanup in `FailedBadgeOperationsService.test.ts`

Goal:
- coverage should fail only because of speed, not because of a broken spec

### 3) Add explicit guardrails so hangs surface faster
Update `vitest.config.ts` to add explicit timeouts for tests, hooks, and teardown.

Why:
- if one spec truly hangs, Vitest will surface it sooner and more clearly
- this improves diagnosis even if it is not the main speed fix

### 4) Remove the avoidable slow waits in tests
Convert the known real-time waits to fake timers where appropriate, and restore real timers after tests that change timer mode.

Targets already identified:
- `src/hooks/useAutoSchedule/__tests__/useAutoScheduleState.test.ts`
- `src/hooks/message-board/__tests__/useMessageBoard.test.ts`
- `src/hooks/auth/__tests__/useAuth.test.ts`
- `src/services/__tests__/FailedBadgeOperationsService.test.ts`

Why:
- this is not the main fix, but it removes wasted time and reduces flakiness

### 5) Add a new fast coverage mode instead of changing the default immediately
Introduce a separate `test:coverage:fast` path first.

In `vitest.config.ts`, add an env flag for fast coverage and, when enabled:
- use forked workers
- allow file parallelism
- try `isolate: false` so module loading can be reused instead of restarted for every file

In `package.json`, add a script like:
- `test:coverage:fast`

Why this is the main fix:
- today the suite is effectively paying setup/import/jsdom overhead again and again in a very constrained runtime
- parallel workers plus reduced isolation should cut the repeated startup cost dramatically

### 6) Validate whether `isolate: false` is safe in this repo
Run the fast coverage path more than once.

If all tests stay stable:
- keep `isolate: false`

If a few tests leak state between files:
- fix those tests if the changes are small and safe
- otherwise fall back to parallel workers with normal isolation

Goal:
- get the biggest speed gain that stays reliable

### 7) Make the fast path the default once proven
After the new mode is stable:
- update `test:coverage` to use the fast settings
- update `test:coverage:ci` to use the fast settings too
- keep the current slow/serial path as the debug and triage fallback

This preserves a safe escape hatch while making normal coverage usable again.

### 8) Refresh the docs and baseline automatically
Once coverage finishes reliably again:
- run `npm run test:coverage:refresh-docs`
- confirm `coverage/coverage-summary.json` is produced
- update `TESTING.md`
- update `coverage-baseline.txt`

Expected doc changes:
- current date
- the top-level coverage percentages
- script descriptions if the default coverage command changes
- troubleshooting guidance so it reflects the new fast default and the old serial mode as fallback

## Technical details
Files likely to change:
- `vitest.config.ts`
- `package.json`
- `TESTING.md`
- `coverage-baseline.txt`
- a small number of test files with timer cleanup/waits

Likely implementation details:
- add `testTimeout`, `hookTimeout`, and `teardownTimeout`
- add `VITEST_FAST_COVERAGE` handling in `vitest.config.ts`
- configure forked workers and file parallelism for fast coverage
- test whether `isolate: false` is stable enough for this suite
- keep `test:coverage:debug` and `test:coverage:triage` as the slow diagnostic tools

## Success criteria
- `npm run test:coverage` finishes comfortably under the current timeout budget
- `npm run test:coverage:ci` no longer times out in Claude/Codex-style environments
- `coverage/coverage-summary.json` is written consistently
- `npm run test:coverage:refresh-docs` updates `TESTING.md` successfully
- `coverage-baseline.txt` can be regenerated again

## Risk to be aware of
The only meaningful risk is the fast path using `isolate: false`. That can expose tests that accidentally depend on fresh module state. If that happens, I’ll keep the fix small: either clean up the few affected tests or fall back to parallel workers without changing test behavior more broadly.
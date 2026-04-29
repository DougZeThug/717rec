# Plan: Fix coverage timeout / baseline-refresh failure

> Working branch: `claude/plan-coverage-timeout-fix-xk7UO`
> Delete this file once the work is merged.

## Goal (updated per user feedback)

Keep **full-codebase coverage** as the practice for the baseline run.
The problem to solve is purely "it doesn't finish in time" — not "it
measures too much". After the fix, the documented refresh path should
actually complete and write `TESTING.md`.

## 1. What broke and why (in plain language)

The documented "refresh baseline" path is:

```
npm run test:coverage:refresh-docs
  → npm run test:coverage     (writes coverage/coverage-summary.json)
  → node tools/sync-testing-baseline.mjs   (rewrites the table in TESTING.md)
```

The first half never finished, so the JSON summary was never written, so
the doc-sync step had nothing to read, so `TESTING.md` was not updated.

Two underlying causes:

### Cause A — coverage runtime exceeds the budgets we set ourselves

- `package.json:18` wraps `test:coverage:ci` in `timeout 10m`.
- `package.json:19` wraps `test:coverage:deepsource` in `timeout 15m`.
- The user reported `timeout 12m npm run test:coverage` also hit
  `exit 124` in the host environment.
- `--maxWorkers=1` is intentional (TESTING.md notes serial coverage is
  the chosen reliability trade-off), but multiplies wall time across
  241 test files.
- Net effect: full coverage ≈ 10-15 min in this environment, which sits
  right at or past every wrapper we set.

### Cause B — `COVERAGE_CRITICAL_ONLY=1` is a dead flag (informational)

- The flag is set in `test:coverage:ci` and `test:coverage:deepsource`
  but is never read (`grep -r COVERAGE_CRITICAL_ONLY` only finds those
  two `package.json` lines).
- It does not currently affect runtime. Mentioned only so a future
  reader doesn't mistake it for the cause.
- Not fixed in this plan unless the user explicitly wants the CI gate
  to run a narrower subset.

### Cause C — at least one failing test in `Contact.test.tsx`

- The user observed a Contact page test failure before the timeout
  fired. Independent of the timeout, but a clean baseline run wants
  zero failures, so we fix it.

## 2. Fix strategy at a glance

| Path                              | Today                                | After fix                                                          |
| --------------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| CI PR gate (`test:coverage:ci`)   | 10-min `timeout`, full suite, serial | unchanged scope; raise wrapper to 25m so it stops being the cap    |
| Baseline refresh (`refresh-docs`) | chains `test:coverage` (no wrapper) | unchanged scope; explicit longer wrapper, optional parallel toggle |
| DeepSource (`:deepsource`)        | 15-min wrapper                       | left alone unless empirically broken                               |

We are **not** narrowing what is measured. We are giving the run room
to finish, and probing whether a pool/worker change can also shorten
it.

## 3. Step-by-step plan

Each numbered step is a separate commit. Stop and report after each;
don't batch.

### Step 1 — Reproduce and fix `Contact.test.tsx`

Independent of coverage; do first so the baseline run is green.

1. `timeout 60s npx vitest run src/pages/__tests__/Contact.test.tsx --reporter=verbose`
2. Read the failure. Two likely shapes:
   - `useForm` mock missing a property the component / zodResolver
     reaches for. Fix: add the missing fields to the mock object.
   - `findByText('Sending...')` races because the mocked
     `submitContactRequest` resolves before React commits the
     loading-state render. Fix: widen the mock's resolution delay or
     assert on `disabled` instead of the spinner text.
3. Commit: `fix(test): repair Contact page test mocks`.

**Out of scope:** rewriting the test to use real `react-hook-form`. The
mocking shape is intentional.

### Step 2 — Measure full-coverage wall time honestly

Before changing anything else, get a real number.

1. `rm -rf coverage`
2. `time npm run test:coverage 2>&1 | tee /tmp/cov-run.log` (no
   `timeout` wrapper — let it finish).
3. Record total elapsed in the commit message of Step 3.
4. If the run still hangs past ~30 min, jump to Step 4 (parallel probe)
   before raising any wrappers.

No code change in this step.

### Step 3 — Raise the timeout wrappers to actually fit the run

The fastest, lowest-risk fix.

1. In `package.json`, change `test:coverage:ci` from `timeout 10m` to
   `timeout 25m`.
   - Rationale: the CI host (GitHub Actions ubuntu-latest) is generally
     faster than the local environment, but headroom is cheap and we
     want one knob, not two.
2. Decide whether to add a wrapper to `test:coverage` itself. Two
   options — discuss with user before picking:
   - (a) leave `test:coverage` un-wrapped (it's a dev command); rely on
     `refresh-docs` to call `:ci` (which is wrapped). Requires
     repointing `refresh-docs` — see Step 5.
   - (b) wrap `test:coverage` in `timeout 25m` directly.
3. Update the script-listing block in `TESTING.md` lines 11-19 so the
   visible commands match (the doc declares scripts authoritative).
4. Commit:
   `chore(coverage): raise wrappers to fit measured wall time (Nm)`,
   filling in the actual measured minutes from Step 2.

### Step 4 — (Conditional) try parallel coverage to shorten the run

Only do this if Step 2 measured > ~15 min, or if the user wants the
refresh to feel snappy.

1. Try one parallel variant at a time, each as its own commit-less
   experiment:
   ```
   time env CI=true VITEST_LIGHT_COVERAGE=1 vitest run --coverage \
     --pool=forks --poolOptions.forks.maxForks=2
   time env CI=true VITEST_LIGHT_COVERAGE=1 vitest run --coverage \
     --pool=forks --poolOptions.forks.maxForks=4
   ```
2. Watch for the symptoms TESTING.md warned about: hangs, missing
   `coverage-summary.json`, flaky tests. If any appear, abandon this
   step and rely on Step 3 alone. Document the finding in the commit
   message of Step 5 ("kept serial, parallelism reproduced X").
3. If a worker count is stable and meaningfully faster, fold it into
   the script as a single change in this commit:
   - Update `test:coverage:ci` to drop `--maxWorkers=1` and add the
     proven `--pool=forks --poolOptions.forks.maxForks=N` flags.
   - Mirror the change in `TESTING.md`'s troubleshooting section so
     the "If `--maxWorkers=1` is stable, keep serial coverage in CI
     for reliability" line stays accurate.
   - Commit: `perf(coverage): run coverage with N forked workers`.

### Step 5 — Make the refresh path use the bounded script

1. Edit `package.json:24`:
   ```
   "test:coverage:refresh-docs": "npm run test:coverage:ci && npm run test:coverage:sync-docs"
   ```
   Rationale: `:ci` already emits `json-summary` (via
   `VITEST_CI_COVERAGE=1` in `vitest.config.ts:18-21`) and now has the
   right wrapper from Step 3.
   - **Coverage scope check before committing:** confirm `:ci` still
     measures the whole codebase, not just `services/hooks/utils`.
     `vitest.config.ts:23-25` narrows `coverageInclude` under
     `VITEST_CI_COVERAGE=1`. If we want full-codebase numbers in the
     baseline doc, we must either (a) flip that branch off when
     refreshing, or (b) introduce a new env flag like
     `COVERAGE_FULL_REPORT=1` that overrides it. **This is the
     decision point that depends on the user's intent** — flag it in
     the commit message.
2. Update `TESTING.md` lines 11-19 to mirror the new chain.
3. Commit:
   `chore(coverage): point refresh-docs at the bounded ci coverage run`.

### Step 6 — Regenerate the baseline

1. `rm -rf coverage`
2. `npm run test:coverage:refresh-docs`
3. Diff should be only the `Last measured:` date and the four metric
   rows under `## Current baseline`.
4. Per TESTING.md policy, do not raise any threshold in
   `vitest.config.ts:58-62` even if there is headroom — that requires
   a dedicated PR.
5. Commit: `docs(testing): refresh coverage baseline`.

### Step 7 — Push and report

1. `git push -u origin claude/plan-coverage-timeout-fix-xk7UO`
2. Do not open a PR (per task rules).
3. Delete this plan file as the final commit.
4. Report: commits made, before/after wall time, new baseline numbers.

## 4. Things explicitly out of scope

- Narrowing what files coverage measures. The user wants whole-codebase
  numbers.
- Wiring up `COVERAGE_CRITICAL_ONLY=1`.
- Raising any coverage threshold.
- Rewriting `react-hook-form` mocks beyond the Contact test fix.
- Migrating off v8 coverage to istanbul.

## 5. Decision points to confirm with user

1. **Step 3 option (a) vs (b)** — wrap `test:coverage` itself, or only
   wrap the CI/refresh paths and leave the bare command unbounded for
   developers? Recommend (a): unbounded for devs, bounded for
   automation.
2. **Step 4** — is it worth the time investment to try parallelism, or
   is "serial but with enough timeout" good enough for a baseline run
   that's done occasionally? Recommend "good enough" unless the run
   exceeds ~25 min.
3. **Step 5 coverage-scope decision** — when refreshing the baseline,
   should the JSON summary cover the whole codebase (matching the
   per-area table in `TESTING.md`) or stay narrowed to
   `services/hooks/utils` like CI does today? The user's stated
   preference is whole-codebase, so the plan defaults to that — but
   the implementation requires deliberately bypassing
   `VITEST_CI_COVERAGE=1`'s narrowing, which is why this is flagged.

## 6. Verification checklist

- [ ] `npx vitest run src/pages/__tests__/Contact.test.tsx` is green.
- [ ] `npm run test` is green.
- [ ] `time npm run test:coverage:refresh-docs` finishes inside the
      raised wrapper and exits 0.
- [ ] `coverage/coverage-summary.json` exists after the run and its
      `total` block reflects the whole codebase (sanity-check by
      counting keys, not just the four metric percentages).
- [ ] `TESTING.md` updated only in the date row + four metric rows.
- [ ] `git status` shows only intended files.

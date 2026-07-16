# PR-02 — Enforce a merge gate: branch protection + a safe lane for Lovable edits

**Phase:** 1 (Baseline) · **Tier:** 1 · **Agent:** Doug manual (GitHub settings) + Claude Code (docs/workflow file) · **Parallelizable:** yes · **Depends on:** PR-01 (main must be green before protection can require the check) · **Expected score impact:** +1.5 overall (Reliability +4, Production readiness +6)

## 1. Background

The repository has excellent CI (lint, typecheck, ~3.4k tests, coverage thresholds, knip, bundle budgets, Playwright smoke/a11y, Lighthouse, migration replay, gitleaks) — but nothing **enforces** it. Evidence from the 2026-07-15 review:

- CI job "Quality, tests, and coverage" was **red on `main`** at the reviewed commit `79744a0`, and red on at least 6 of the previous 10 `main` runs that day — yet PR #1043 merged anyway.
- Of the last 40 commits on `main`, **16 (40%) are direct pushes** by `gpt-engineer-app[bot]` (Lovable), which never see a PR or a required check.
- Both currently-failing tests were broken by same-day direct bot pushes (`329793e`, `6fd916d`) whose product changes were fine but whose tests were never updated — exactly the class of regression a merge gate catches.

This is the single highest-leverage fix in the review: every other quality investment (16 PR briefs, 456 test files) is only as durable as the gate that stops red merges.

## 2. Objective

No commit reaches `main` unless "Quality, tests, and coverage", "Build and bundle size", and "Browser smoke, a11y, and Lighthouse" have passed on that code.

Two known limits of this objective, stated up front:
- The Browser check's Lighthouse step is currently `warn`-only (finding F-16), so a below-threshold Lighthouse result can still merge until **PR-03** promotes those assertions to `error`. This gate is still worth enabling first — it blocks failing tests, builds, smoke and axe — but treat PR-03 as the completion of this check's meaning.
- `ci.yml` is **path-filtered** (`paths:` on both `push` and `pull_request`), and GitHub has no path-conditional required checks — a docs-only PR would sit forever on "Expected — waiting for status". Step 2a below resolves this before any check is marked required.

## 3. Exact scope

GitHub repository settings (Doug, manual) + one repo doc + (option B only) Lovable project setting.

## 4. Files to modify

- `docs/OPERATIONS.md` (add "merge gate" section documenting the chosen setup)
- No product code.

## 5. Implementation steps

**Option A — strict (recommended if Lovable supports working on a branch):**
1. In Lovable project settings → GitHub, switch Lovable to commit to a dedicated branch (e.g. `lovable/edits`) instead of `main`.
2a. **Make the required checks always report.** Remove the `paths:` filters from `ci.yml`'s `pull_request` trigger (keep them on `push` if desired) so every PR — including docs-only ones — runs and reports the three jobs. If full-CI-on-docs-PRs is too heavy, use GitHub's documented alternative instead: a second workflow with identical job names that runs on the inverse paths (`paths-ignore`) and exits green immediately, so the required-check names always resolve. Do NOT mark `Apply migrations + SQL smoke tests` as required — `supabase-ci.yml` is also path-filtered, and non-DB PRs would hang on it; it stays an advisory check that runs when `supabase/**` changes.
2. GitHub → Settings → Branches → add branch protection rule for `main`:
   - Require a pull request before merging (allow squash/merge, 0 required reviewers is acceptable for a solo maintainer).
   - Require status checks to pass: `Quality, tests, and coverage`, `Build and bundle size`, `Browser smoke, a11y, and Lighthouse` (all three must always report — that's what step 2a guarantees; the path-filtered Supabase check stays advisory).
   - Require branches to be up to date before merging.
   - Do **not** allow bypass for apps/bots.
3. Document the flow in `docs/OPERATIONS.md`: Lovable edits → `lovable/edits` branch → auto-PR → checks → merge.

**Option B — temporary ungated exception (only if Lovable cannot work on a branch):**
Be clear about what this is: Option B does **not** meet this brief's objective or acceptance criteria — Lovable can still push a failing commit straight to `main`, and the repair routine reacts only *after* the violation. It is a stop-gap that shortens red-main time from days to hours, not a gate.
1. Add the same branch protection rule but with "Restrict who can push" left open for the Lovable app (it keeps pushing to `main`).
2. Add a lightweight auto-repair routine: a scheduled/`workflow_run`-triggered job (or a Claude Code Routine) that, when CI on `main` goes red, opens an issue (or a fix PR) within the hour.
3. Document in `docs/OPERATIONS.md` that the merge gate is NOT yet in force, why, and the trigger for revisiting (e.g. Lovable branch support shipping).
4. Acceptance under Option B is limited to: protection rule active for non-Lovable actors + repair routine demonstrably firing on a red `main` within an hour. The §11 criteria below apply to Option A only.

## 6. Database requirements

None.

## 7. UI/UX requirements

None.

## 8. Testing requirements

Deliberately open a test PR with a failing test and verify GitHub blocks the merge button; then fix and verify it unblocks.

## 9. Validation commands

```bash
# after setup, from any branch:
git push -u origin test/protection-probe   # open PR with an intentionally failing test
# expect: merge blocked until checks pass
```

## 10. Manual verification checklist (Doug)

- [ ] Settings → Branches shows a rule on `main` with the 3 required checks.
- [ ] A red-check PR shows a disabled merge button.
- [ ] (Option A) A Lovable edit lands as a PR from `lovable/edits`, not a direct `main` commit.
- [ ] `git log --first-parent -10 main` a week later shows no new direct bot pushes (Option A).

## 11. Acceptance criteria

- Branch protection active on `main` with required checks named above.
- `docs/OPERATIONS.md` documents the chosen option and the Lovable lane.
- One demonstration PR shows the gate blocking a red merge.

## 12. Non-goals / rollback

- Non-goals: adding new CI jobs (PR-03), changing Lovable usage itself, requiring human review on every PR.
- Rollback: delete the branch protection rule; revert the docs commit. (No code risk — this PR changes process, not behavior.)

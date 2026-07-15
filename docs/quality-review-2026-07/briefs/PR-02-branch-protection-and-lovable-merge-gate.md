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

## 3. Exact scope

GitHub repository settings (Doug, manual) + one repo doc + (option B only) Lovable project setting.

## 4. Files to modify

- `docs/OPERATIONS.md` (add "merge gate" section documenting the chosen setup)
- No product code.

## 5. Implementation steps

**Option A — strict (recommended if Lovable supports working on a branch):**
1. In Lovable project settings → GitHub, switch Lovable to commit to a dedicated branch (e.g. `lovable/edits`) instead of `main`.
2. GitHub → Settings → Branches → add branch protection rule for `main`:
   - Require a pull request before merging (allow squash/merge, 0 required reviewers is acceptable for a solo maintainer).
   - Require status checks to pass: `Quality, tests, and coverage`, `Build and bundle size`, `Browser smoke, a11y, and Lighthouse` (and `Apply migrations + SQL smoke tests` for PRs touching `supabase/`).
   - Require branches to be up to date before merging.
   - Do **not** allow bypass for apps/bots.
3. Document the flow in `docs/OPERATIONS.md`: Lovable edits → `lovable/edits` branch → auto-PR → checks → merge.

**Option B — pragmatic (if Lovable must stay on `main`):**
1. Add the same branch protection rule but with "Restrict who can push" left open for the Lovable app (it keeps pushing to `main`).
2. Add a lightweight auto-repair routine: a scheduled/`workflow_run`-triggered job (or a Claude Code Routine) that, when CI on `main` goes red, opens an issue (or a fix PR) within the hour, so red-main states are measured in hours, not days.
3. Document the residual risk in `docs/OPERATIONS.md`.

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

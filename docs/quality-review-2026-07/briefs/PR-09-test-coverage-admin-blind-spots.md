# PR-09 — Test coverage for the admin blind spots (auto-schedule, live corrections, auth) + mock hygiene

**Phase:** 3 (Tests) · **Tier:** 2 · **Agent:** Claude Code or Codex · **Parallelizable:** yes; can be split into 3 sub-PRs · **Depends on:** PR-01 · **Expected score impact:** +0.9 overall (Automated testing +6, Reliability +1)

## 1. Background

Overall coverage is healthy (65.4% lines) but concentrated: pages and services are well covered while several **live, data-mutating admin subtrees have near-zero automated verification at any layer** (unit, e2e, or SQL). Measured from this review's coverage run:

| Subtree | Coverage | Risk |
|---|---|---|
| Admin auto-schedule (~27 files, ~2,300 lines) | **1.16% stmts** | generates the league's entire weekly schedule |
| Admin live-corrections (5 files) | **0%** | edits/deletes completed live-scoring rounds, changes game winners |
| Auth UI + AuthContext | ~32% | the front door for every admin/member |
| Blind-draw, dashboard shell, themes, contact-inbox, help sections | 0% | lower risk, still live admin surface |
| History drag-and-drop standings rewrite | ~0% | rewrites historical records |

Two systemic test-hygiene issues compound this: `vi.clearAllMocks()` clears call history but **not** mock implementations, which is exactly how PR-01's stale-stub leak happened (`useTimeslotMutation.test.ts`); and `vitest.config.ts:76-98` sets no coverage floor for `src/components` / `src/pages`, so component regressions only dent the global aggregate.

## 2. Objective

The three highest-risk untested subtrees gain behavioral tests; coverage floors prevent silent regression; the stale-stub failure mode is eliminated as a pattern.

## 3. Exact scope

Test files + `vitest.config.ts` + `src/setupTests.ts`. **No product code changes** (if tests expose product bugs, file them — separate PRs).

## 4. Files to create / modify

- `src/components/admin/dashboard/auto-schedule/**/__tests__/` (new)
- `src/components/admin/live-corrections/__tests__/` (new)
- `src/hooks/auth/__tests__/`, `src/pages/__tests__/Auth.test.tsx` (extend)
- `vitest.config.ts` (per-dir thresholds)
- `src/setupTests.ts` (add `vi.resetAllMocks` guidance or afterEach reset where safe)

## 5. Implementation steps

1. **Auto-schedule** (highest value): behavioral tests for the scheduling algorithm — given N teams/divisions/timeslots: every team scheduled once per week, no double-booking, bye handling, double-header constraint, determinism with a seeded shuffle. Test the pure utils in `src/utils/autoSchedule/` first (biggest bang, no rendering), then one component test for the tab's happy path.
2. **Live corrections**: tests for round edit/delete flows — mock at the service boundary; assert the correct RPC/service calls, confirmation dialogs, and cache invalidation; cover the EditRoundDialog remote-change clobber case (a known waiver risk at `EditRoundDialog.tsx:98-121`).
3. **Auth**: AuthContext state transitions (login success/failure, session restore, logout), admin-gate redirect behavior (mirrors `e2e/admin-access.spec.ts` at unit level).
4. **Mock hygiene sweep**: in test files using `mockReturnValue` on shared validator/service mocks, make each test set its own stub explicitly (audit `useTimeslotMutation.test.ts` neighbors per PR-01's hygiene note). Prefer `vi.resetAllMocks()` in `afterEach` for new test files.
5. **Coverage floors**: add per-path thresholds for `src/components/admin/**` and `src/hooks/**` at ~5 points below post-PR measured values, so the new coverage can't silently erode. Update `coverage-baseline.txt` via `npm run test:coverage:update-baseline`.

## 6. Database requirements

None.

## 7. UI/UX requirements

None.

## 8. Testing requirements

This PR *is* tests. Keep total runtime reasonable: prefer pure-function tests over rendering where possible (the auto-schedule utils especially).

## 9. Validation commands

```bash
npm run test:file -- src/utils/autoSchedule src/components/admin/live-corrections src/hooks/auth
npm run test:coverage && npm run typecheck && npm run lint
```

## 10. Manual verification checklist (Doug)

- [ ] CI coverage step passes with the new floors.
- [ ] Ask the agent for the before/after coverage table of the three subtrees and sanity-check the numbers.

## 11. Acceptance criteria

- Auto-schedule utils ≥70% lines; live-corrections ≥60%; auth ≥60% (tune to what's achievable without product changes; document actuals in the PR).
- New per-dir thresholds active in `vitest.config.ts`.
- Full suite green.

## 12. Non-goals / rollback

- Non-goals: fixing product bugs the tests reveal (file separately), e2e expansion (PR-03 owns the real-backend path), playoffs UI tests (PR-13 follow-up territory).
- Rollback: tests are additive; thresholds can be relaxed by one-line edits if they prove flaky.

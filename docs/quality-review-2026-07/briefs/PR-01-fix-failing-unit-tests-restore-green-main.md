# PR-01 — Fix the 2 failing unit tests and restore a green `main`

**Phase:** 1 (Baseline) · **Tier:** 1 · **Agent:** Claude Code or Codex (repo-level test work; not Lovable) · **Parallelizable:** yes (independent of every other brief) · **Depends on:** nothing · **Expected score impact:** +1.0 overall (Automated testing +4, Production readiness +3)

## 1. Background

`main` at commit `79744a0` has 2 deterministically failing unit tests (3,424 of 3,427 pass). The GitHub Actions job **"Quality, tests, and coverage"** is red on `main`; because the test step fails, the coverage-threshold and knip steps are skipped too. Both failures were root-caused during the 2026-07-15 quality review as **stale tests** — the product changes that broke them (both same-day Lovable/gpt-engineer-app[bot] commits merged directly to `main`) are correct and should be kept:

- Commit `3cd759b` ("Aligned double header validation", merge `329793e`) replaced `useTimeslotMutation`'s inline empty-team check with the shared `TimeslotValidator.validateBatchAssignment()`. The test mocks `TimeslotValidator` but never stubs `validateBatchAssignment` for the empty-list case, so a `{valid:true}` stub leaks in from an earlier test (`vi.clearAllMocks()` clears call history, **not** mock implementations) and the hook proceeds to call the unstubbed service, returning `undefined` instead of `null`.
- Commit `11aeb99` ("Added snapshot rollback on fail", merge `6fd916d`) added a **correct** rollback in `useMatchUpdate`'s catch block (`setMatches(previousMatches)` at `src/hooks/matches/updates/useMatchUpdate.ts:196-200`) so a mid-flight failure no longer leaves the UI showing an optimistically-updated match. The test still asserts `setMatches` is never called on failure; it is now called exactly once, with the original (unchanged) array.

## 2. Objective

All 3,427 unit tests pass on `main`; the "Quality, tests, and coverage" CI job (including the previously-skipped coverage and knip steps) is green.

## 3. Exact scope

Test-file-only changes. **No product code changes.**

## 4. Files to modify

- `src/hooks/__tests__/useTimeslotMutation.test.ts`
- `src/hooks/matches/updates/__tests__/useMatchUpdate.test.tsx`

## 5. Implementation steps

1. In `useTimeslotMutation.test.ts`, test "batchAssignDoubleHeaders: validates empty team list" (~line 250): stub the validator explicitly before invoking:
   ```typescript
   validateBatchAssignmentMock.mockReturnValue({ valid: false, error: 'At least one team must be selected' });
   ```
   Keep `resolves.toBeNull()` and `expect(batchAssignDoubleHeadersMock).not.toHaveBeenCalled()`; update the expected toast description to the validator's message.
2. Hygiene in the same file: the neighboring "missing slots", "duplicate slots", and success-path tests currently rely on a leaked `{valid:true}` implementation. Give each an explicit `validateBatchAssignmentMock.mockReturnValue(...)` so no test depends on stub leakage order.
3. In `useMatchUpdate.test.tsx`, test "returns false when the match update itself throws and leaves state untouched" (~line 316): replace
   ```typescript
   expect(setMatches).not.toHaveBeenCalled();
   ```
   with
   ```typescript
   expect(setMatches).toHaveBeenCalledTimes(1);
   expect(setMatches).toHaveBeenCalledWith([incompleteMatch]); // rollback to the untouched original
   ```
4. Run the two files, then the full gate (commands below).

## 6. Database requirements

None.

## 7. UI/UX requirements

None (no product change).

## 8. Testing requirements

- The two named tests pass and still assert the *behavioral* contract (empty list blocked before any service call; failed update leaves visible state equal to the original).
- No reduction in assertions — the rollback test must still verify state equals the original snapshot, not merely "was called".

## 9. Validation commands

```bash
npm run test:file -- src/hooks/__tests__/useTimeslotMutation.test.ts src/hooks/matches/updates/__tests__/useMatchUpdate.test.tsx
npm run typecheck && npm run lint && npm run test:coverage && npm run build
```

## 10. Manual verification checklist (Doug)

- [ ] GitHub → Actions: latest "CI" run on `main` is fully green, including "Enforce coverage thresholds" and "Check dead code" steps (they were skipped while tests failed).

## 11. Acceptance criteria

- `npm test` exits 0 with 0 failed tests.
- CI "Quality, tests, and coverage" job green on the merge commit.
- Diff touches only the two test files.

## 12. Non-goals / rollback

- Non-goals: refactoring the hooks, changing validator behavior, adding new tests (PR-09 covers mock hygiene more broadly).
- Rollback: revert the single commit; product behavior is unaffected either way.

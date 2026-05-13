## Bug verified

`src/utils/scheduling/greedy/scheduleOdd.ts` accepts the orchestrator's pre-computed `relaxationLevel` and runs **one** pass of `generateSlotPairings` for S1 and S2. If either slot is short, it only invokes a single `attemptRepairPass` at hard-coded level `3`. There is no retry loop that progressively bumps `relaxationLevel` 0→1→2→3 the way `scheduleEven.ts` (lines 157–219) does.

Consequence: with 7 teams and `maxTierGap=1`, when the feasibility pre-check returns level 0 but greedy ordering dynamically exhausts valid opponents, S1/S2 produce fewer than `(N-1)/2` matches and the final total is 6 instead of 7. Tier constraints (relaxed at level 1) are never tried — the only escape is a level-3 repair on already-leftover unmatched teams, which is too late and skips the minimal-relaxation step.

## Fix

Mirror `scheduleEven`'s progressive relaxation in `scheduleOdd.ts`. Single file changed.

Steps inside `scheduleOdd`, after the initial S1+S2 generation (current lines 56–135):

1. Compute `expectedPerSlot = Math.floor((teams.length - 1) / 2)`.
2. While `(s1Matches.length < expectedPerSlot || s2Matches.length < expectedPerSlot) && relaxationLevel < 3`:
   - Bump `relaxationLevel` by 1; record `diagnostics.relaxationApplied` and push `'tier_constraints'` (lvl 1) / `'season_rematches'` (lvl 2) into `diagnostics.constraintsRelaxed`.
   - Reset state the same way `scheduleEven` does: `tonightPairs.clear()` then re-seed from `forbiddenPairs`, `newPairs.clear()`, `teamMatchCounts.clear()`.
   - Re-pick `bye1` (and `bye2` via the existing canPlay loop) at the new relaxation level — bye selection itself depends on `relaxationLevel`, so reusing the level-0 byes would defeat the retry.
   - Re-run `generateSlotPairings` for S1 (excluding `bye1.id`) and S2 (excluding `bye2.id`) at the new level, followed by `rematchRepairPass` for each (same call shape as the initial pass).
3. Keep the existing repair-pass block (lines 137–177) as the final safety net for any still-unmatched teams.
4. Leave the S3 `bye1 vs bye2` construction and validation/logging untouched.

`forbiddenPairs` is not currently in `OddScheduleArgs`. Add it (optional `Set<string> | undefined`) and pass it through from `index.ts` so the retry loop can correctly re-seed `tonightPairs` — same as `scheduleEven` does.

## Files

- `src/utils/scheduling/greedy/scheduleOdd.ts` — add retry loop, accept `forbiddenPairs`.
- `src/utils/scheduling/greedy/index.ts` — pass `forbiddenPairs` into `scheduleOdd({...})`.

## Verification

- `npm run test:file -- src/utils/scheduling/greedy/__tests__/scheduleOdd.test.ts`
- Add a focused regression test: 7 teams across 3 tiers with `maxTierGap=1` that previously returned 6 matches; assert `matches.length === 7` and `diagnostics.constraintsRelaxed` includes `'tier_constraints'`.
- Full suite: `npm test` to confirm no other scheduler tests regress.

Risk: Low — additive retry, existing single-pass behavior is preserved when the first pass already produces a complete schedule. Rollback: revert the two files.
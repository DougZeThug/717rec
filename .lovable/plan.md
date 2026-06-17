## Background

`BracketUpdateService.updateMatch()` already calls `normalizeGrandFinalPopulation` and `propagateCompletedMatches` after every match update, so in theory the WB Final and LB Final do trigger GF backfill. In practice the broken Spring 2026 bracket proves there are edge cases (timing/races with brackets-manager, error swallow paths) where one pass isn't enough and the GF stays empty until an admin manually retries.

## Goal

Whenever the just-updated match *is* the WB Final or the LB Final and it just transitioned to completed, run a dedicated, retrying GF repair pass immediately afterwards — so the Grand Final populates without an admin clicking "Recalculate Standings".

## Plan

1. **New helper in `LbStructureService`**: `isWbFinalRound(roundId, stageId)` and `isLbFinalRound(roundId, stageId)` — small wrappers around the existing `findWbFinalRound` / `findLbFinalRound` returning a boolean.

2. **New method on `GrandFinalNormalizationService`**: `repairGrandFinalWithRetries(stageId, opts?)`:
   - Reads GF round 1 match.
   - If both slots are already filled, returns immediately.
   - Otherwise calls `normalizeGrandFinalPopulation(stageId)`.
   - Re-reads the GF match; if still missing a slot, waits 150ms and retries — up to 3 attempts (configurable).
   - Logs each attempt with `bracketLog`. Always returns; never throws.

3. **Wire it into `BracketUpdateService.updateMatch()`**:
   - After the existing `normalizeGrandFinalPopulation` + `propagateCompletedMatches` calls and after re-fetching `updatedMatch`, check whether the updated match is now `status === 4` AND lives in the WB Final round or LB Final round of its stage.
   - If yes, await `normalizationService.repairGrandFinalWithRetries(stageId)`.
   - This runs for both the NORMAL and BYE paths (the check happens after they merge), so a BYE-won WB Final also triggers the repair.
   - Failures are logged but swallowed so they cannot break the update.

4. **Expose the new method on `BracketNormalizationService`** (facade) and `BracketManagerService` is not needed — only the update service uses it.

5. **Tests**:
   - Extend `BracketNormalizationService.test.ts`: `repairGrandFinalWithRetries` returns early when GF is already populated; retries when first pass leaves a slot empty and succeeds on the second pass.
   - Extend `BracketUpdateService.test.ts`: after updating a match whose `round_id` matches the WB Final round, `repairGrandFinalWithRetries` is invoked; for an unrelated match (e.g. WB R1) it is not invoked.

## Out of scope

- No UI changes — the "Recalculate Standings" button stays as a fallback.
- No changes to the periodic safety nets that already run after every update.
- No new realtime subscriptions or background jobs.

## Risk

Low. The added pass is idempotent (same code path as the manual retry) and only runs when the just-updated match is one of two specific terminal matches.

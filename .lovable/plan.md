

## Fix: BYE Match Winners Not Propagating to Next LB Round

### Problem
When a BYE match (e.g., LB R2) is scored, `manager.update.match()` crashes with "Position is undefined." We catch this as non-fatal, but **propagation never happens** — the winner stays stuck and never advances to LB R3. The existing normalizations only cover LB R1 duplicates and Grand Final population, so intermediate LB rounds are missed entirely.

### Root Cause
The library rejects updates on BYE-completed matches (`status: Locked/Waiting`). Our code unlocks them via direct SQL, but this desynchronizes the library's internal state. When `manager.update.match()` runs, the library's propagation logic crashes because participant positions are undefined in the modified match.

### Fix: Skip the Library for BYE Matches, Propagate Manually

**File: `src/services/brackets/manager/services/BracketUpdateService.ts`**

When the match is a BYE match, bypass `manager.update.match()` entirely and handle everything via direct SQL:

1. **Mark the BYE match as completed** — set the present opponent's score/result to `win`, status to `4` (Completed), directly in the database.
2. **Find the next match** — query the next round in the same group, calculate the target match number (`Math.ceil(currentMatch.number / 2)`) and slot (odd match → opponent1, even → opponent2).
3. **Place the winner** — update the next match's opponent slot with the winner's participant ID and set status to `2` (Ready) if it's currently Locked/Waiting.
4. **Skip `manager.update.match()`** — the `continue`-to-normalization flow runs as before, but the library call is bypassed for BYE matches.

**File: `src/services/brackets/manager/services/BracketNormalizationService.ts`**

Add a new `propagateCompletedMatches(stageId)` method as a safety net:

1. Find all matches in the LB (group 2) that are status `4` (Completed) with a winner.
2. For each, verify the winner appears in the next round's corresponding match.
3. If missing, place the winner in the correct slot.

Call this from `BracketUpdateService` alongside the existing normalizations.

### Changes Summary

| File | Change |
|------|--------|
| `BracketUpdateService.ts` | BYE match path: direct SQL update + manual propagation, skip `manager.update.match()` |
| `BracketNormalizationService.ts` | Add `propagateCompletedMatches()` defensive normalization |

Two files, ~60 lines added.


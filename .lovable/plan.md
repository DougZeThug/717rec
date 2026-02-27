

## Analysis: "Match not found" Error in Bracket Score Submission

### What Happened
The user scored LB Final match 2028 (Here for Fireball vs On a Mission, score 1-2). The actual match update succeeded (PATCH 204), but `brackets-manager` crashed during **post-update propagation** when calling `getMatchesBeforeMinorRoundLB`.

### Root Cause
This is a **brackets-manager library bug**. The library's internal `findMatch` method looks for a match at `{round_id: 900, number: 4}` — WB Finals (round 900) only has 1 match (number 1), not 4. The library incorrectly calculates the corresponding WB match number for LB round 4 (the LB Final) in an 8-team double elimination bracket.

The error trace:
```text
findMatch({round_id: 900, number: 4})  →  returns []  →  throws "Match not found"
  ← getMatchesBeforeMinorRoundLB
    ← updatePrevious
      ← updateRelatedMatches
        ← updateMatch
```

### Impact
- The match score **was saved** to the database (PATCH succeeded)
- The error occurs in the **propagation phase** (advancing winner to Grand Final)
- The GF opponent2 slot may not have been populated automatically
- The existing `normalizeGrandFinalPopulation` in `BracketNormalizationService` should fix the GF population, but it never runs because the error throws before reaching it

### Fix

**File: `src/services/brackets/manager/services/BracketUpdateService.ts`**

Wrap the `manager.update.match()` call to catch "Match not found" errors specifically. Since the actual match data is already saved by the time propagation runs, we can:
1. Catch the error
2. Log a warning instead of throwing
3. Continue to the normalization steps (which already handle GF population)
4. This way the GF will be properly populated by `normalizeGrandFinalPopulation`

The change is in the `try` block around line 92-95, wrapping `await this.manager.update.match(updatePayload)` in its own try-catch that handles "Match not found" as a non-fatal propagation error, allowing the normalization steps to still run.

### Technical Details
- Match 2028: LB group 262, round 904 (LB round number 4), match number 1
- Library looks for WB round 900 match 4, but only match 1 exists
- This is a known edge case in brackets-manager's double elimination logic for 8-team brackets
- The `DialogTitle` and `aria-describedby` warnings in the logs are unrelated accessibility warnings from the bracket score dialog component

